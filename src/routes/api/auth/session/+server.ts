import { json } from '@sveltejs/kit';
import {
	createUserSession,
	userSessionCookieName,
	verifyLineAccessToken
} from '$lib/server/auth/line';

export async function POST({ request, cookies, platform, url }) {
	try {
		const { accessToken } = (await request.json()) as { accessToken?: string };

		if (!accessToken) {
			return json({ success: false, message: 'Missing LINE access token' }, { status: 400 });
		}

		const profile = await verifyLineAccessToken(accessToken);
		const sessionValue = await createUserSession(profile.sub, platform?.env);

		cookies.set(userSessionCookieName, sessionValue, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			maxAge: 60 * 60 * 24 * 7
		});

		return json({
			success: true,
			userId: profile.sub,
			name: profile.name || ''
		});
	} catch {
		return json({ success: false, message: 'LINE 驗證失敗' }, { status: 401 });
	}
}
