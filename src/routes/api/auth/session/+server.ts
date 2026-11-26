import { json } from '@sveltejs/kit';
import {
	createAuthSession,
	sessionCookieOptions,
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
		const sessionValue = await createAuthSession(
			{
				provider: 'line',
				subject: profile.sub,
				name: profile.name || null
			},
			platform?.env
		);

		cookies.set(userSessionCookieName, sessionValue, sessionCookieOptions(url));

		return json({
			success: true,
			provider: 'line',
			userId: profile.sub,
			name: profile.name || ''
		});
	} catch {
		return json({ success: false, message: 'LINE 驗證失敗' }, { status: 401 });
	}
}
