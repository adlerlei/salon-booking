import { eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { pushSubscriptions } from '$lib/server/db/schema';
import {
	buildBookingNotificationText,
	DEFAULT_ADMIN_DASHBOARD_URL,
	type BookingNotificationPayload
} from './message';

export type PushSubscriptionJSON = {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		p256dh: string;
		auth: string;
	};
};

const getEnv = (
	env: Env | undefined,
	key: 'WEB_PUSH_VAPID_PUBLIC_KEY' | 'WEB_PUSH_VAPID_PRIVATE_KEY' | 'WEB_PUSH_VAPID_SUBJECT'
) => env?.[key] || process.env[key] || '';

export const isWebPushConfigured = (env: Env | undefined) =>
	Boolean(
		getEnv(env, 'WEB_PUSH_VAPID_PUBLIC_KEY') &&
			getEnv(env, 'WEB_PUSH_VAPID_PRIVATE_KEY') &&
			getEnv(env, 'WEB_PUSH_VAPID_SUBJECT')
	);

export const getVapidPublicKey = (env: Env | undefined) => getEnv(env, 'WEB_PUSH_VAPID_PUBLIC_KEY');

export const savePushSubscription = async (
	platform: Readonly<App.Platform> | undefined,
	input: {
		endpoint: string;
		p256dh: string;
		auth: string;
		userAgent?: string | null;
		createdBy: string;
	}
) => {
	const db = initDb(platform);
	await db
		.insert(pushSubscriptions)
		.values({
			endpoint: input.endpoint,
			p256dh: input.p256dh,
			auth: input.auth,
			userAgent: input.userAgent || null,
			createdBy: input.createdBy,
			createdAt: new Date(),
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: pushSubscriptions.endpoint,
			set: {
				p256dh: input.p256dh,
				auth: input.auth,
				userAgent: input.userAgent || null,
				createdBy: input.createdBy,
				updatedAt: new Date()
			}
		});
};

export const deletePushSubscription = async (
	platform: Readonly<App.Platform> | undefined,
	endpoint: string
) => {
	const db = initDb(platform);
	await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
};

export const notifyWebPushAboutNewBooking = async (
	platform: Readonly<App.Platform> | undefined,
	payload: BookingNotificationPayload
) => {
	if (!isWebPushConfigured(platform?.env)) {
		return { sent: false, reason: 'missing_config' as const, delivered: 0 };
	}

	const db = initDb(platform);
	const subscriptions = await db.select().from(pushSubscriptions);

	if (subscriptions.length === 0) {
		return { sent: false, reason: 'no_subscriptions' as const, delivered: 0 };
	}

	const adminUrl =
		platform?.env?.LINE_NOTIFICATION_ADMIN_URL ||
		process.env.LINE_NOTIFICATION_ADMIN_URL ||
		DEFAULT_ADMIN_DASHBOARD_URL;
	const bodyText = buildBookingNotificationText(payload, adminUrl);

	let webpush: typeof import('web-push');
	try {
		webpush = await import('web-push');
	} catch (error) {
		console.error('web-push module unavailable', error);
		return { sent: false, reason: 'module_unavailable' as const, delivered: 0 };
	}

	webpush.setVapidDetails(
		getEnv(platform?.env, 'WEB_PUSH_VAPID_SUBJECT'),
		getEnv(platform?.env, 'WEB_PUSH_VAPID_PUBLIC_KEY'),
		getEnv(platform?.env, 'WEB_PUSH_VAPID_PRIVATE_KEY')
	);

	const notificationPayload = JSON.stringify({
		title: 'Jo造型髮藝・新預約',
		body: `${payload.customerName}／${payload.serviceType}`,
		url: '/admin',
		text: bodyText
	});

	let delivered = 0;
	for (const row of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: row.endpoint,
					keys: { p256dh: row.p256dh, auth: row.auth }
				},
				notificationPayload
			);
			delivered += 1;
		} catch (error: any) {
			const statusCode = error?.statusCode;
			console.error('Web Push send failed', statusCode || error);
			if (statusCode === 404 || statusCode === 410) {
				await deletePushSubscription(platform, row.endpoint);
			}
		}
	}

	return {
		sent: delivered > 0,
		reason: delivered > 0 ? ('webpush_sent' as const) : ('all_failed' as const),
		delivered
	};
};
