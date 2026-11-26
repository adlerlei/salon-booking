import { eq } from 'drizzle-orm';
import { listAdminRecords } from '$lib/server/admin';
import type { AdminRecord } from '$lib/server/admin';
import { initDb } from '$lib/server/db';
import { notificationStates } from '$lib/server/db/schema';
import {
	buildBookingNotificationText,
	DEFAULT_ADMIN_DASHBOARD_URL,
	type BookingNotificationPayload
} from './message';

const NOTIFICATION_KEY = 'admin-booking-line';

type QuotaResponse = {
	type: 'none' | 'limited';
	value?: number;
};

type QuotaConsumptionResponse = {
	totalUsage: number;
};

type NotificationState = typeof notificationStates.$inferSelect;

const getOptionalEnv = (
	env: Env | undefined,
	key:
		| 'LINE_CHANNEL_ACCESS_TOKEN'
		| 'LINE_NOTIFICATION_MONTHLY_LIMIT'
		| 'LINE_NOTIFICATION_ADMIN_URL'
) => env?.[key] || process.env[key];

const parseOptionalInt = (value: string | undefined) => {
	if (!value) return null;

	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getQuotaPeriod = (now = new Date()) => {
	const formatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Tokyo',
		year: 'numeric',
		month: '2-digit'
	});

	return formatter.format(now).slice(0, 7);
};

const fetchLineApi = async <T>(accessToken: string, path: string, init?: RequestInit) => {
	const response = await fetch(`https://api.line.me${path}`, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${accessToken}`,
			...(init?.headers || {})
		}
	});

	if (!response.ok) {
		const body = await response.text();
		throw new Error(`LINE API ${path} failed: ${response.status} ${body}`);
	}

	if (response.status === 204) {
		return null as T;
	}

	return (await response.json()) as T;
};

const sendTextPush = async (accessToken: string, userId: string, text: string) => {
	await fetchLineApi<null>(accessToken, '/v2/bot/message/push', {
		method: 'POST',
		body: JSON.stringify({
			to: userId,
			messages: [
				{
					type: 'text',
					text
				}
			]
		})
	});
};

const sendTextPushes = async (accessToken: string, userIds: string[], text: string) => {
	const results = await Promise.allSettled(
		userIds.map((userId) => sendTextPush(accessToken, userId, text))
	);

	for (const [index, result] of results.entries()) {
		if (result.status === 'rejected') {
			console.error(`Failed to send LINE push message to admin ${userIds[index]}`, result.reason);
		}
	}

	return results.filter((result) => result.status === 'fulfilled').length;
};

const buildQuotaWarningMessage = (period: string, adminUrl: string) =>
	[
		'【通知暫停】',
		`${period} LINE 通知額度即將用完`,
		'這是本月最後一則自動通知提醒',
		'後續新預約請改看管理後台',
		`後台：${adminUrl}`,
		'下個月會自動恢復通知'
	].join('\n');

const upsertNotificationState = async (
	platform: Readonly<App.Platform> | undefined,
	state: Partial<NotificationState> & Pick<NotificationState, 'key' | 'period'>
) => {
	const db = initDb(platform);
	const nextState = {
		isPaused: false,
		warningSentAt: null,
		updatedAt: new Date(),
		...state
	};

	await db
		.insert(notificationStates)
		.values(nextState)
		.onConflictDoUpdate({
			target: notificationStates.key,
			set: {
				period: nextState.period,
				isPaused: nextState.isPaused,
				warningSentAt: nextState.warningSentAt,
				updatedAt: nextState.updatedAt
			}
		});
};

const getNotificationState = async (
	platform: Readonly<App.Platform> | undefined,
	period: string
) => {
	const db = initDb(platform);
	const [state] = await db
		.select()
		.from(notificationStates)
		.where(eq(notificationStates.key, NOTIFICATION_KEY));

	if (!state) {
		const initialState: NotificationState = {
			key: NOTIFICATION_KEY,
			period,
			isPaused: false,
			warningSentAt: null,
			updatedAt: new Date()
		};

		await upsertNotificationState(platform, initialState);
		return initialState;
	}

	if (state.period !== period) {
		const resetState: NotificationState = {
			...state,
			period,
			isPaused: false,
			warningSentAt: null,
			updatedAt: new Date()
		};

		await upsertNotificationState(platform, resetState);
		return resetState;
	}

	return state;
};

const getMonthlyQuotaLimit = async (accessToken: string, env: Env | undefined) => {
	try {
		const quota = await fetchLineApi<QuotaResponse>(accessToken, '/v2/bot/message/quota');

		if (quota.type === 'limited' && typeof quota.value === 'number' && quota.value > 0) {
			return quota.value;
		}
	} catch (error) {
		console.error('Failed to fetch LINE monthly quota', error);
	}

	return parseOptionalInt(getOptionalEnv(env, 'LINE_NOTIFICATION_MONTHLY_LIMIT'));
};

const getMonthlyQuotaUsage = async (accessToken: string) => {
	const usage = await fetchLineApi<QuotaConsumptionResponse>(
		accessToken,
		'/v2/bot/message/quota/consumption'
	);

	return usage.totalUsage;
};

const pauseNotifications = async (
	platform: Readonly<App.Platform> | undefined,
	period: string,
	warningSentAt: Date | null
) =>
	upsertNotificationState(platform, {
		key: NOTIFICATION_KEY,
		period,
		isPaused: true,
		warningSentAt
	});

export const notifyAdminsAboutNewBooking = async (
	platform: Readonly<App.Platform> | undefined,
	payload: BookingNotificationPayload
) => {
	const accessToken = getOptionalEnv(platform?.env, 'LINE_CHANNEL_ACCESS_TOKEN');

	if (!accessToken) {
		return { sent: false, reason: 'missing_access_token' as const };
	}

	const admins = await listAdminRecords(platform);
	const adminUserIds = admins.map((admin: AdminRecord) => admin.lineUserId).filter(Boolean);

	if (adminUserIds.length === 0) {
		return { sent: false, reason: 'no_admins' as const };
	}

	const period = getQuotaPeriod();
	const state = await getNotificationState(platform, period);

	if (state.isPaused) {
		return { sent: false, reason: 'paused' as const };
	}

	const monthlyLimit = await getMonthlyQuotaLimit(accessToken, platform?.env);

	if (!monthlyLimit) {
		return { sent: false, reason: 'missing_quota_limit' as const };
	}

	const used = await getMonthlyQuotaUsage(accessToken);
	const remaining = Math.max(0, monthlyLimit - used);
	const notificationCost = adminUserIds.length;
	const warningCost = adminUserIds.length;
	const adminUrl =
		getOptionalEnv(platform?.env, 'LINE_NOTIFICATION_ADMIN_URL') || DEFAULT_ADMIN_DASHBOARD_URL;

	if (remaining < notificationCost + warningCost) {
		if (!state.warningSentAt && remaining >= warningCost) {
			const warningMessage = buildQuotaWarningMessage(period, adminUrl);
			await sendTextPushes(accessToken, adminUserIds, warningMessage);
			await pauseNotifications(platform, period, new Date());
			return { sent: false, reason: 'warning_sent' as const };
		}

		await pauseNotifications(platform, period, state.warningSentAt || null);
		return { sent: false, reason: 'quota_low' as const };
	}

	const bookingMessage = buildBookingNotificationText(payload, adminUrl);
	const deliveredCount = await sendTextPushes(accessToken, adminUserIds, bookingMessage);

	const estimatedRemaining = remaining - Math.max(deliveredCount, 0);

	if (!state.warningSentAt && estimatedRemaining < notificationCost + warningCost) {
		if (estimatedRemaining >= warningCost) {
			const warningMessage = buildQuotaWarningMessage(period, adminUrl);
			await sendTextPushes(accessToken, adminUserIds, warningMessage);
			await pauseNotifications(platform, period, new Date());
			return { sent: true, reason: 'booking_and_warning_sent' as const };
		}

		await pauseNotifications(platform, period, null);
		return { sent: true, reason: 'booking_sent_notifications_paused' as const };
	}

	return { sent: true, reason: 'booking_sent' as const };
};
