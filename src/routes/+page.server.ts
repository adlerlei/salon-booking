import { getDbErrorMessage, initDb } from '$lib/server/db';
import { appointments, closures } from '$lib/server/db/schema';
import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { verifyLineAccessToken } from '$lib/server/auth/line';
import { isGoogleAuthConfigured, verifyGoogleIdToken } from '$lib/server/auth/google';
import {
	createAuthSession,
	sessionCookieOptions,
	userSessionCookieName
} from '$lib/server/auth/session';
import {
	createGuestSubject,
	isValidTaiwanMobile,
	normalizeTaiwanMobile
} from '$lib/server/auth/guest';
import type { AuthIdentity, AuthProvider } from '$lib/server/auth/types';
import { countFutureConfirmedByPhone } from '$lib/server/bookings';
import { notifyAdminsAboutNewBooking } from '$lib/server/notifications';
import { listActiveAnnouncements } from '$lib/server/news';
import { toTaipeiNowString } from '$lib/server/time';
import { serviceDurations } from '$lib/services';
import { getTurnstileSiteKey, isTurnstileConfigured, verifyTurnstileToken } from '$lib/server/turnstile';

const OPEN_MINUTES = 11 * 60;
const LATEST_BOOKING_MINUTES = 20 * 60 + 30;
const CLOSE_MINUTES = 21 * 60;

const timeToMinutes = (timeStr: string) => {
	const [hours, minutes] = timeStr.split(':').map(Number);
	return hours * 60 + minutes;
};

export const load = async ({ platform, locals }) => {
	const googleClientId =
		platform?.env?.GOOGLE_CLIENT_ID ||
		process.env.GOOGLE_CLIENT_ID ||
		process.env.PUBLIC_GOOGLE_CLIENT_ID ||
		'';

	try {
		const db = initDb(platform);
		const today = toTaipeiNowString().split('T')[0];

		const [allAppointments, allClosures, bookingAnnouncements] = await Promise.all([
			db
				.select({
					appointmentDate: appointments.appointmentDate,
					durationMinutes: appointments.durationMinutes
				})
				.from(appointments)
				.where(and(eq(appointments.status, 'confirmed'), gte(appointments.appointmentDate, today))),
			db
				.select({
					date: closures.date,
					startTime: closures.startTime,
					endTime: closures.endTime,
					reason: closures.reason
				})
				.from(closures)
				.where(gte(closures.date, today)),
			listActiveAnnouncements(platform, true)
		]);

		return {
			appointments: allAppointments,
			closures: allClosures,
			announcements: bookingAnnouncements,
			loadError: '',
			auth: locals.auth,
			googleEnabled: isGoogleAuthConfigured(platform?.env),
			googleClientId,
			turnstileSiteKey: getTurnstileSiteKey(platform?.env),
			turnstileEnabled: isTurnstileConfigured(platform?.env)
		};
	} catch (err) {
		console.error('Failed to load booking page data:', err);
		return {
			appointments: [],
			closures: [],
			announcements: [],
			loadError: getDbErrorMessage(err, '系統資料載入失敗，請稍後再試。'),
			auth: locals.auth,
			googleEnabled: isGoogleAuthConfigured(platform?.env),
			googleClientId,
			turnstileSiteKey: getTurnstileSiteKey(platform?.env),
			turnstileEnabled: isTurnstileConfigured(platform?.env)
		};
	}
};

type ServiceItem = { service: string; duration: number };

const resolveIdentityFromForm = async ({
	data,
	existingAuth,
	platform,
	cookies,
	url
}: {
	data: FormData;
	existingAuth: AuthIdentity | null;
	platform: App.Platform | undefined;
	cookies: import('@sveltejs/kit').Cookies;
	url: URL;
}): Promise<{ identity: AuthIdentity } | { error: string }> => {
	const authProvider = (data.get('authProvider') as AuthProvider | '') || '';
	const accessToken = (data.get('accessToken') as string) || '';
	const googleIdToken = (data.get('googleIdToken') as string) || '';
	const guestPhoneRaw = (data.get('guestPhone') as string) || '';
	const guestName = ((data.get('guestName') as string) || '').trim();

	let identity: AuthIdentity | null = null;

	if (authProvider === 'line' || (!authProvider && accessToken)) {
		if (!accessToken) return { error: '缺少 LINE 驗證資訊' };
		const profile = await verifyLineAccessToken(accessToken);
		identity = { provider: 'line', subject: profile.sub, name: profile.name || null };
	} else if (authProvider === 'google' || (!authProvider && googleIdToken)) {
		if (!googleIdToken) return { error: '缺少 Google 登入資訊' };
		const profile = await verifyGoogleIdToken(googleIdToken, platform?.env);
		identity = {
			provider: 'google',
			subject: profile.sub,
			name: profile.name || null,
			email: profile.email || null
		};
	} else if (authProvider === 'guest' || (!authProvider && guestPhoneRaw)) {
		const phone = normalizeTaiwanMobile(guestPhoneRaw || existingAuth?.phone || '');
		if (!isValidTaiwanMobile(phone)) {
			return { error: '請輸入有效的台灣手機號碼（09 開頭共 10 碼）' };
		}
		identity = {
			provider: 'guest',
			subject: existingAuth?.provider === 'guest' ? existingAuth.subject : createGuestSubject(),
			name: guestName || existingAuth?.name || null,
			phone
		};
	} else if (existingAuth) {
		identity = existingAuth;
	}

	if (!identity) {
		return { error: '請先以 LINE、Google 登入，或填寫手機號碼後再預約' };
	}

	cookies.set(
		userSessionCookieName,
		await createAuthSession(identity, platform?.env),
		sessionCookieOptions(url)
	);

	return { identity };
};

export const actions = {
	default: async ({ request, platform, cookies, url, locals }) => {
		try {
			const data = await request.formData();
			const appointmentDate = data.get('appointmentDate') as string;
			const servicesJsonStr = data.get('servicesJson') as string;
			const partySize = parseInt((data.get('partySize') as string) || '1') || 1;

			if (!appointmentDate) {
				return { success: false, message: '預約資料不完整' };
			}

			const resolved = await resolveIdentityFromForm({
				data,
				existingAuth: locals.auth,
				platform,
				cookies,
				url
			});
			if ('error' in resolved) {
				return { success: false, message: resolved.error };
			}
			const { identity } = resolved;

			let serviceItems: ServiceItem[] = [];

			if (servicesJsonStr) {
				try {
					serviceItems = JSON.parse(servicesJsonStr) as ServiceItem[];
				} catch {
					return { success: false, message: '預約資料格式錯誤' };
				}
			} else {
				const serviceType = data.get('serviceType') as string;
				if (!serviceType) return { success: false, message: '預約資料不完整' };
				serviceItems = [{ service: serviceType, duration: serviceDurations[serviceType] || 60 }];
			}

			if (serviceItems.length === 0) {
				return { success: false, message: '請至少選擇一項服務' };
			}

			for (const item of serviceItems) {
				if (!(item.service in serviceDurations)) {
					return { success: false, message: `不支援的服務項目：${item.service}` };
				}
			}

			const durationMinutes = serviceItems.reduce((sum, item) => sum + item.duration, 0);
			const serviceType = serviceItems.map((item) => item.service).join('・');
			const servicesJson = JSON.stringify(serviceItems);

			if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(appointmentDate)) {
				return { success: false, message: '預約日期時間格式錯誤' };
			}

			const db = initDb(platform);
			const nowInTaipei = toTaipeiNowString();

			if (appointmentDate < nowInTaipei) {
				return { success: false, message: '不能預約已經過去的時段' };
			}

			if (identity.provider === 'guest') {
				const turnstile = await verifyTurnstileToken(
					(data.get('turnstileToken') as string) || '',
					platform?.env,
					request.headers.get('cf-connecting-ip')
				);
				if (!turnstile.ok) {
					return { success: false, message: turnstile.message || '防機器人驗證失敗' };
				}

				if (identity.phone) {
					const existingCount = await countFutureConfirmedByPhone(db, identity.phone);
					if (existingCount > 0) {
						return {
							success: false,
							message: '此手機號碼已有即將到來的預約，如需更改請先取消原預約'
						};
					}
				}
			}

			const [selectedDate, selectedTime] = appointmentDate.split('T');
			const [year, month, day] = selectedDate.split('-').map(Number);
			if (new Date(year, month - 1, day).getDay() === 0) {
				return { success: false, message: '週日公休，無法預約' };
			}

			const selectedStartMinutes = timeToMinutes(selectedTime);
			const selectedEndMinutes = selectedStartMinutes + durationMinutes;

			if (
				selectedStartMinutes < OPEN_MINUTES ||
				selectedStartMinutes > LATEST_BOOKING_MINUTES ||
				selectedEndMinutes > CLOSE_MINUTES
			) {
				return { success: false, message: '請選擇營業時間（11:00–21:00）內可完成的時段' };
			}

			const dateClosures = await db
				.select({ date: closures.date, startTime: closures.startTime, endTime: closures.endTime })
				.from(closures)
				.where(eq(closures.date, selectedDate));

			const closureBlocked = dateClosures.some(
				(c: { date: string; startTime: string | null; endTime: string | null }) => {
					if (!c.startTime || !c.endTime) return true;
					const cStart = timeToMinutes(c.startTime);
					const cEnd = timeToMinutes(c.endTime);
					return selectedStartMinutes < cEnd && selectedEndMinutes > cStart;
				}
			);

			if (closureBlocked) {
				return { success: false, message: '該時段為公休時間，無法預約' };
			}

			const existingAppointments = await db
				.select({
					appointmentDate: appointments.appointmentDate,
					durationMinutes: appointments.durationMinutes
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.status, 'confirmed'),
						gte(appointments.appointmentDate, `${selectedDate}T`),
						lt(appointments.appointmentDate, `${selectedDate}T\uffff`)
					)
				);

			const hasConflict = existingAppointments.some(
				(booking: { appointmentDate: string; durationMinutes: number }) => {
					if (!booking.appointmentDate.startsWith(selectedDate)) return false;

					const bookingTime = booking.appointmentDate.split('T')[1];
					const bookingStartMinutes = timeToMinutes(bookingTime);
					const bookingEndMinutes = bookingStartMinutes + booking.durationMinutes;

					return (
						selectedStartMinutes < bookingEndMinutes && selectedEndMinutes > bookingStartMinutes
					);
				}
			);

			if (hasConflict) {
				return { success: false, message: '這個時段已經被預約，請重新選擇' };
			}

			// 短時間重複提交：同一身份、同一時段、同一服務內容
			const recentDuplicates = await db
				.select({
					id: appointments.id,
					createdAt: appointments.createdAt
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.authProvider, identity.provider),
						eq(appointments.authSubject, identity.subject),
						eq(appointments.appointmentDate, appointmentDate),
						eq(appointments.serviceType, serviceType),
						eq(appointments.status, 'confirmed')
					)
				)
				.orderBy(desc(appointments.createdAt))
				.limit(1);

			const latestDuplicate = recentDuplicates[0];
			if (latestDuplicate?.createdAt) {
				const ageMs = Date.now() - new Date(latestDuplicate.createdAt).getTime();
				if (ageMs >= 0 && ageMs < 2 * 60 * 1000) {
					return {
						success: false,
						message: '相同預約剛送出成功，請勿重複提交'
					};
				}
			}

			// 寫入前再檢查一次時段衝突，降低併發雙寫機率
			const recheckAppointments = await db
				.select({
					appointmentDate: appointments.appointmentDate,
					durationMinutes: appointments.durationMinutes
				})
				.from(appointments)
				.where(
					and(
						eq(appointments.status, 'confirmed'),
						gte(appointments.appointmentDate, `${selectedDate}T`),
						lt(appointments.appointmentDate, `${selectedDate}T\uffff`)
					)
				);

			const stillConflict = recheckAppointments.some(
				(booking: { appointmentDate: string; durationMinutes: number }) => {
					if (!booking.appointmentDate.startsWith(selectedDate)) return false;
					const bookingTime = booking.appointmentDate.split('T')[1];
					const bookingStartMinutes = timeToMinutes(bookingTime);
					const bookingEndMinutes = bookingStartMinutes + booking.durationMinutes;
					return (
						selectedStartMinutes < bookingEndMinutes && selectedEndMinutes > bookingStartMinutes
					);
				}
			);

			if (stillConflict) {
				return { success: false, message: '這個時段剛剛被預約，請重新選擇' };
			}

			const customerName =
				identity.name ||
				(identity.provider === 'guest'
					? '訪客'
					: identity.provider === 'google'
						? 'Google 用戶'
						: 'LINE 使用者');

			await db.insert(appointments).values({
				lineUserId: identity.provider === 'line' ? identity.subject : null,
				customerName,
				serviceType,
				durationMinutes,
				partySize,
				servicesJson,
				appointmentDate,
				authProvider: identity.provider,
				authSubject: identity.subject,
				phone: identity.phone || null,
				email: identity.email || null,
				source: identity.provider,
				createdAt: new Date()
			});

			const notifyName = partySize > 1 ? `${customerName}（${partySize}人）` : customerName;

			const notificationTask = notifyAdminsAboutNewBooking(platform, {
				customerName: notifyName,
				serviceType,
				durationMinutes,
				appointmentDate,
				source: identity.provider,
				phone: identity.phone || null
			}).catch((error) => {
				console.error('Failed to notify admins about new booking', error);
			});

			if (platform?.ctx) {
				platform.ctx.waitUntil(notificationTask);
			} else {
				await notificationTask;
			}

			return {
				success: true,
				service: serviceType,
				date: appointmentDate,
				name: customerName,
				duration: String(durationMinutes),
				partySize: String(partySize)
			};
		} catch (err) {
			console.error('Booking failed:', err);
			return {
				success: false,
				message: '預約失敗，請確認登入狀態後再試一次'
			};
		}
	}
};
