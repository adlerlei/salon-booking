import type { AuthIdentity, AuthProvider } from './types';

const USER_SESSION_COOKIE = 'salon_user_session';
const SESSION_VERSION = 'v2';

type SessionEnv = Pick<Env, 'LINE_SESSION_SECRET'>;

const encoder = new TextEncoder();

const getSecret = (env: Env | undefined) => {
	const value = env?.LINE_SESSION_SECRET || process.env.LINE_SESSION_SECRET;
	if (!value) {
		throw new Error('LINE_SESSION_SECRET is not configured');
	}
	return value;
};

const toBase64Url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');

const fromBase64Url = (value: string) => {
	const padded = value.replace(/-/g, '+').replace(/_/g, '/');
	const padLength = (4 - (padded.length % 4)) % 4;
	const base64 = padded + '='.repeat(padLength);
	const binary = atob(base64);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

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

const isAuthProvider = (value: unknown): value is AuthProvider =>
	value === 'line' || value === 'guest';

export const createAuthSession = async (identity: AuthIdentity, env: Env | undefined) => {
	const payload = {
		v: SESSION_VERSION,
		p: identity.provider,
		s: identity.subject,
		n: identity.name || undefined,
		e: identity.email || undefined,
		ph: identity.phone || undefined
	};
	const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
	const signature = await sign(encodedPayload, getSecret(env));
	return `${SESSION_VERSION}.${encodedPayload}.${signature}`;
};

/** @deprecated 舊版 LINE-only cookie；讀取端仍相容 */
export const createUserSession = async (userId: string, env: Env | undefined) =>
	createAuthSession({ provider: 'line', subject: userId }, env);

export const readAuthSession = async (
	sessionValue: string | undefined,
	env: Env | undefined
): Promise<AuthIdentity | null> => {
	if (!sessionValue) return null;

	const secret = env?.LINE_SESSION_SECRET || process.env.LINE_SESSION_SECRET;
	if (!secret) return null;

	if (sessionValue.startsWith(`${SESSION_VERSION}.`)) {
		const parts = sessionValue.split('.');
		if (parts.length !== 3) return null;
		const [, encodedPayload, signature] = parts;
		const expectedSignature = await sign(encodedPayload, secret);
		if (!timingSafeEqual(signature, expectedSignature)) return null;

		try {
			const json = new TextDecoder().decode(fromBase64Url(encodedPayload));
			const payload = JSON.parse(json) as {
				p?: unknown;
				s?: unknown;
				n?: unknown;
				e?: unknown;
				ph?: unknown;
			};
			if (!isAuthProvider(payload.p) || typeof payload.s !== 'string' || !payload.s) {
				return null;
			}
			return {
				provider: payload.p,
				subject: payload.s,
				name: typeof payload.n === 'string' ? payload.n : null,
				email: typeof payload.e === 'string' ? payload.e : null,
				phone: typeof payload.ph === 'string' ? payload.ph : null
			};
		} catch {
			return null;
		}
	}

	// 舊格式：`${lineUserId}.${signature}`
	const separatorIndex = sessionValue.lastIndexOf('.');
	if (separatorIndex <= 0) return null;

	const userId = sessionValue.slice(0, separatorIndex);
	const signature = sessionValue.slice(separatorIndex + 1);
	if (!userId || !signature) return null;

	const expectedSignature = await sign(userId, secret);
	if (!timingSafeEqual(signature, expectedSignature)) return null;

	return { provider: 'line', subject: userId };
};

export const readUserSession = async (sessionValue: string | undefined, env: Env | undefined) => {
	const identity = await readAuthSession(sessionValue, env);
	return identity?.provider === 'line' ? identity.subject : null;
};

export const userSessionCookieName = USER_SESSION_COOKIE;

export const sessionCookieOptions = (url: URL) => ({
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: url.protocol === 'https:',
	maxAge: 60 * 60 * 24 * 30
});

export type { SessionEnv };
