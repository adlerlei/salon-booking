import { json } from '@sveltejs/kit';
import {
	createGuestSubject,
	isValidTaiwanMobile,
	normalizeTaiwanMobile
} from '$lib/server/auth/guest';
import { createAuthSession, sessionCookieOptions, userSessionCookieName } from '$lib/server/auth/session';

export async function POST({ request, cookies, platform, url }) {
	try {
		const body = (await request.json()) as { phone?: string; name?: string };
		const phone = normalizeTaiwanMobile(body.phone || '');
		const name = (body.name || '').trim();

		if (!name) {
			return json({ success: false, message: '請填寫稱呼／姓名' }, { status: 400 });
		}

		if (!isValidTaiwanMobile(phone)) {
			return json(
				{ success: false, message: '請輸入有效的台灣手機號碼（09 開頭共 10 碼）' },
				{ status: 400 }
			);
		}

		const sessionValue = await createAuthSession(
			{
				provider: 'guest',
				subject: createGuestSubject(),
				name,
				phone
			},
			platform?.env
		);

		cookies.set(userSessionCookieName, sessionValue, sessionCookieOptions(url));

		return json({
			success: true,
			provider: 'guest',
			name,
			phone
		});
	} catch {
		return json({ success: false, message: '訪客登入失敗，請稍後再試' }, { status: 500 });
	}
}
