const USER_SESSION_COOKIE = 'salon_user_session';

type VerifyLineProfileResult = {
	sub: string;
	name?: string;
	picture?: string;
};

const encoder = new TextEncoder();

const getEnv = (env: Env | undefined, key: keyof Pick<Env, 'LINE_SESSION_SECRET'>) => {
	const value = env?.[key] || process.env[key];
	if (!value) {
		throw new Error(`${key} is not configured`);
	}

	return value;
};

const toBase64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');

const timingSafeEqual = (left: string, right: string) => {
	if (left.length !== right.length) return false;

	let mismatch = 0;
	for (let i = 0; i < left.length; i++) {
		mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
	}

	return mismatch === 0;
};

const sign = async (value: string, secret: string) => {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
	return toBase64Url(new Uint8Array(signature));
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

export const createUserSession = async (userId: string, env: Env | undefined) => {
	const signature = await sign(userId, getEnv(env, 'LINE_SESSION_SECRET'));
	return `${userId}.${signature}`;
};

export const readUserSession = async (sessionValue: string | undefined, env: Env | undefined) => {
	if (!sessionValue) return null;

	const separatorIndex = sessionValue.lastIndexOf('.');
	if (separatorIndex <= 0) return null;

	const userId = sessionValue.slice(0, separatorIndex);
	const signature = sessionValue.slice(separatorIndex + 1);
	const secret = env?.LINE_SESSION_SECRET;

	if (!userId || !signature || !secret) return null;

	const expectedSignature = await sign(userId, secret);
	return timingSafeEqual(signature, expectedSignature) ? userId : null;
};

export const userSessionCookieName = USER_SESSION_COOKIE;
