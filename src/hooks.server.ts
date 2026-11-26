import type { Handle } from '@sveltejs/kit';
import { readAuthSession, userSessionCookieName } from '$lib/server/auth/session';

export const handle: Handle = async ({ event, resolve }) => {
	const identity = await readAuthSession(
		event.cookies.get(userSessionCookieName),
		event.platform?.env
	);

	event.locals.auth = identity;
	event.locals.lineUserId = identity?.provider === 'line' ? identity.subject : null;

	const response = await resolve(event);

	const path = event.url.pathname;
	if (path === '/' || path.startsWith('/api/') || path.startsWith('/admin')) {
		response.headers.set('Cache-Control', 'no-store');
	}

	return response;
};
