import { initDb } from '$lib/server/db';
import { appointments, closures } from '$lib/server/db/schema';
import { eq, gte } from 'drizzle-orm';
import { verifyLineAccessToken } from '$lib/server/auth/line';
import { notifyAdminsAboutNewBooking } from '$lib/server/notifications/line';

// 服務對應的時間（分鐘）
const serviceDurations: Record<string, number> = {
	男生單剪: 20,
	女生單剪: 30,
	男生洗剪: 30,
	女生洗剪: 50,
	男生染髮: 120,
	女生染髮: 150, // 取 2.5 小時
	男生燙髮: 120,
	女生燙髮: 210, // 取 3.5 小時
	'洗髮+頭皮保養': 40,
	'洗剪+頭皮保養': 60,
	'護髮+洗髮': 30,
	'護髮+剪髮+洗髮': 60
};

const toTaipeiNowString = () => {
	const formatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Taipei',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});

	const parts = Object.fromEntries(
		formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
	);

	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

const timeToMinutes = (timeStr: string) => {
	const [hours, minutes] = timeStr.split(':').map(Number);
	return hours * 60 + minutes;
};

export const load = async ({ platform }) => {
	const db = initDb(platform);
	const today = toTaipeiNowString().split('T')[0];

	const [allAppointments, allClosures] = await Promise.all([
		db
			.select({
				appointmentDate: appointments.appointmentDate,
				durationMinutes: appointments.durationMinutes
			})
			.from(appointments)
			.where(eq(appointments.status, 'confirmed')),
		db
			.select({
				date: closures.date,
				startTime: closures.startTime,
				endTime: closures.endTime,
				reason: closures.reason
			})
			.from(closures)
			.where(gte(closures.date, today))
	]);

	return {
		appointments: allAppointments,
		closures: allClosures
	};
};

type ServiceItem = { service: string; duration: number };

export const actions = {
	default: async ({ request, platform }) => {
		try {
			const data = await request.formData();
			const accessToken = data.get('accessToken') as string;
			const appointmentDate = data.get('appointmentDate') as string;
			const servicesJsonStr = data.get('servicesJson') as string;
			const partySize = parseInt((data.get('partySize') as string) || '1') || 1;

			if (!accessToken) {
				return { success: false, message: '缺少 LINE 驗證資訊' };
			}

			if (!appointmentDate) {
				return { success: false, message: '預約資料不完整' };
			}

			let serviceItems: ServiceItem[] = [];

			if (servicesJsonStr) {
				try {
					serviceItems = JSON.parse(servicesJsonStr) as ServiceItem[];
				} catch {
					return { success: false, message: '預約資料格式錯誤' };
				}
			} else {
				// 舊版相容：單服務
				const serviceType = data.get('serviceType') as string;
				if (!serviceType) return { success: false, message: '預約資料不完整' };
				serviceItems = [{ service: serviceType, duration: serviceDurations[serviceType] || 60 }];
			}

			if (serviceItems.length === 0) {
				return { success: false, message: '請至少選擇一項服務' };
			}

			// 驗證所有服務都合法
			for (const item of serviceItems) {
				if (!(item.service in serviceDurations)) {
					return { success: false, message: `不支援的服務項目：${item.service}` };
				}
			}

			const durationMinutes = serviceItems.reduce((sum, item) => sum + item.duration, 0);
			const serviceType = serviceItems.map((item) => item.service).join('・');
			const servicesJson = JSON.stringify(serviceItems);

			const profile = await verifyLineAccessToken(accessToken);
			const db = initDb(platform);
			const nowInTaipei = toTaipeiNowString();

			if (appointmentDate < nowInTaipei) {
				return { success: false, message: '不能預約已經過去的時段' };
			}

			const [selectedDate, selectedTime] = appointmentDate.split('T');
			const selectedStartMinutes = timeToMinutes(selectedTime);
			const selectedEndMinutes = selectedStartMinutes + durationMinutes;

			const dateClosures = await db
				.select({ date: closures.date, startTime: closures.startTime, endTime: closures.endTime })
				.from(closures)
				.where(eq(closures.date, selectedDate));

			const closureBlocked = dateClosures.some((c) => {
				if (!c.startTime || !c.endTime) return true;
				const cStart = timeToMinutes(c.startTime);
				const cEnd = timeToMinutes(c.endTime);
				return selectedStartMinutes < cEnd && selectedEndMinutes > cStart;
			});

			if (closureBlocked) {
				return { success: false, message: '該時段為公休時間，無法預約' };
			}

			const existingAppointments = await db
				.select({
					appointmentDate: appointments.appointmentDate,
					durationMinutes: appointments.durationMinutes
				})
				.from(appointments)
				.where(eq(appointments.status, 'confirmed'));

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

			await db.insert(appointments).values({
				lineUserId: profile.sub,
				customerName: profile.name || 'LINE 使用者',
				serviceType,
				durationMinutes,
				partySize,
				servicesJson,
				appointmentDate,
				createdAt: new Date()
			});

			const notifyName =
				partySize > 1
					? `${profile.name || 'LINE 使用者'}（${partySize}人）`
					: profile.name || 'LINE 使用者';

			const notificationTask = notifyAdminsAboutNewBooking(platform, {
				customerName: notifyName,
				serviceType,
				durationMinutes,
				appointmentDate
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
				name: profile.name || 'LINE 使用者',
				duration: String(durationMinutes),
				partySize: String(partySize)
			};
		} catch {
			return {
				success: false,
				message: '預約失敗，請重新登入 LINE 後再試一次'
			};
		}
	}
};
