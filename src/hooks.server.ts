import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// 攔截所有 /admin 開頭的網址
	if (event.url.pathname.startsWith('/admin')) {
		const auth = event.request.headers.get('Authorization');

		// 預設帳號：admin，密碼：123456 (Base64 編碼為 YWRtaW46MTIzNDU2)
		if (auth !== 'Basic YWRtaW46MTIzNDU2') {
			return new Response('請輸入帳號密碼', {
				status: 401,
				headers: {
					'WWW-Authenticate': 'Basic realm="Admin Area"'
				}
			});
		}
	}

	return resolve(event);
};
