import type { Handle } from '@sveltejs/kit';
import { readUserSession, userSessionCookieName } from '$lib/server/auth/line';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.lineUserId = await readUserSession(
		event.cookies.get(userSessionCookieName),
		event.platform?.env
	);

	const response = await resolve(event);

	const path = event.url.pathname;
	if (path === '/' || path.startsWith('/api/') || path.startsWith('/admin')) {
		response.headers.set('Cache-Control', 'no-store');
	}

	return response;
};
