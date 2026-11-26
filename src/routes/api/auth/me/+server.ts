import { json } from '@sveltejs/kit';
import { isWebPushConfigured } from '$lib/server/notifications/webpush';

export async function GET({ locals, platform }) {
	return json({
		auth: locals.auth,
		webPushConfigured: isWebPushConfigured(platform?.env)
	});
}
