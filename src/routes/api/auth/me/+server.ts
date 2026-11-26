import { json } from '@sveltejs/kit';
import { isGoogleAuthConfigured } from '$lib/server/auth/google';

export async function GET({ locals, platform }) {
	return json({
		auth: locals.auth,
		googleEnabled: isGoogleAuthConfigured(platform?.env),
		publicGoogleClientId:
			platform?.env?.GOOGLE_CLIENT_ID ||
			process.env.GOOGLE_CLIENT_ID ||
			process.env.PUBLIC_GOOGLE_CLIENT_ID ||
			''
	});
}
