import { buildPushPayload } from '@block65/webcrypto-web-push';
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

	const vapid = {
		subject: getEnv(platform?.env, 'WEB_PUSH_VAPID_SUBJECT'),
		publicKey: getEnv(platform?.env, 'WEB_PUSH_VAPID_PUBLIC_KEY'),
		privateKey: getEnv(platform?.env, 'WEB_PUSH_VAPID_PRIVATE_KEY')
	};

	const notificationPayload = JSON.stringify({
		title: 'Jo造型髮藝・新預約',
		body: `${payload.customerName}／${payload.serviceType}`,
		url: '/admin',
		text: bodyText
	});

	let delivered = 0;
	for (const row of subscriptions) {
		const subscription = {
			endpoint: row.endpoint,
			expirationTime: null,
			keys: { p256dh: row.p256dh, auth: row.auth }
		};

		try {
			const requestInit = await buildPushPayload(
				{
					data: notificationPayload,
					options: {
						ttl: 60 * 60,
						urgency: 'high'
					}
				},
				subscription,
				vapid
			);

			const response = await fetch(row.endpoint, requestInit);
			if (response.ok || response.status === 201) {
				delivered += 1;
				continue;
			}

			const responseText = await response.text().catch(() => '');
			console.error('Web Push send failed', response.status, responseText);
			if (response.status === 404 || response.status === 410) {
				await deletePushSubscription(platform, row.endpoint);
			}
		} catch (error) {
			console.error('Web Push send failed', error);
		}
	}

	return {
		sent: delivered > 0,
		reason: delivered > 0 ? ('webpush_sent' as const) : ('all_failed' as const),
		delivered
	};
};
