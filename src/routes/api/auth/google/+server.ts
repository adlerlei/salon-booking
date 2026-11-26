import { json } from '@sveltejs/kit';
import { createAuthSession, sessionCookieOptions, userSessionCookieName } from '$lib/server/auth/session';
import { isGoogleAuthConfigured, verifyGoogleIdToken } from '$lib/server/auth/google';

export async function POST({ request, cookies, platform, url }) {
	try {
		if (!isGoogleAuthConfigured(platform?.env)) {
			return json(
				{ success: false, message: '尚未設定 Google 登入，請稍後再試或改用手機預約' },
				{ status: 503 }
			);
		}

		const { idToken } = (await request.json()) as { idToken?: string };
		if (!idToken) {
			return json({ success: false, message: '缺少 Google 登入資訊' }, { status: 400 });
		}

		const profile = await verifyGoogleIdToken(idToken, platform?.env);
		const sessionValue = await createAuthSession(
			{
				provider: 'google',
				subject: profile.sub,
				name: profile.name || null,
				email: profile.email || null
			},
			platform?.env
		);

		cookies.set(userSessionCookieName, sessionValue, sessionCookieOptions(url));

		return json({
			success: true,
			provider: 'google',
			userId: profile.sub,
			name: profile.name || '',
			email: profile.email || ''
		});
	} catch {
		return json({ success: false, message: 'Google 驗證失敗' }, { status: 401 });
	}
}
