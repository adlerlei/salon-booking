import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin';
import { isWebPushConfigured, savePushSubscription } from '$lib/server/notifications/webpush';

export async function POST({ request, locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	if (!isWebPushConfigured(platform?.env)) {
		return json({ success: false, message: '尚未設定 Web Push VAPID 金鑰' }, { status: 503 });
	}

	try {
		const body = (await request.json()) as {
			endpoint?: string;
			keys?: { p256dh?: string; auth?: string };
		};

		if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
			return json({ success: false, message: '訂閱資料不完整' }, { status: 400 });
		}

		await savePushSubscription(platform, {
			endpoint: body.endpoint,
			p256dh: body.keys.p256dh,
			auth: body.keys.auth,
			userAgent: request.headers.get('user-agent'),
			createdBy: auth.lineUserId
		});

		return json({ success: true });
	} catch (err) {
		console.error('Failed to save push subscription', err);
		return json({ success: false, message: '儲存推播訂閱失敗' }, { status: 500 });
	}
}
