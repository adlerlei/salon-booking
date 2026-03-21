import { json } from '@sveltejs/kit';
import {
	createUserSession,
	userSessionCookieName,
	verifyLineAccessToken
} from '$lib/server/auth/line';

export async function POST({ request, cookies, platform }) {
	const { accessToken } = (await request.json()) as { accessToken?: string };

	if (!accessToken) {
		return json({ success: false, message: 'Missing LINE access token' }, { status: 400 });
	}

	try {
		const profile = await verifyLineAccessToken(accessToken);
		const sessionValue = await createUserSession(profile.sub, platform?.env);

		cookies.set(userSessionCookieName, sessionValue, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 24 * 7
		});

		return json({
			success: true,
			userId: profile.sub,
			name: profile.name || ''
		});
	} catch (error) {
		return json({ success: false, message: 'LINE 驗證失敗' }, { status: 401 });
	}
}
