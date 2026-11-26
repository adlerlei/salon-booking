export {
	createAuthSession,
	createUserSession,
	readAuthSession,
	readUserSession,
	sessionCookieOptions,
	userSessionCookieName
} from './session';

export type VerifyLineProfileResult = {
	sub: string;
	name?: string;
	picture?: string;
};

export const verifyLineAccessToken = async (accessToken: string) => {
	const response = await fetch('https://api.line.me/v2/profile', {
		headers: {
			Authorization: `Bearer ${accessToken}`
		}
	});

	if (!response.ok) {
		throw new Error('LINE access token verification failed');
	}

	const profile = (await response.json()) as {
		userId?: string;
		displayName?: string;
		pictureUrl?: string;
		statusMessage?: string;
	};
	const payload: VerifyLineProfileResult = {
		sub: profile.userId || '',
		name: profile.displayName,
		picture: profile.pictureUrl
	};

	if (!payload.sub) {
		throw new Error('Invalid LINE profile payload');
	}

	return payload;
};
