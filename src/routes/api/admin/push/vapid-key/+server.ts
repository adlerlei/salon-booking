import { json } from '@sveltejs/kit';
import { requireAdmin } from '$lib/server/admin';
import { getVapidPublicKey, isWebPushConfigured } from '$lib/server/notifications/webpush';

export async function GET({ locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	return json({
		configured: isWebPushConfigured(platform?.env),
		publicKey: getVapidPublicKey(platform?.env) || ''
	});
}
