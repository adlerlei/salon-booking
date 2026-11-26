export type GoogleProfile = {
	sub: string;
	name?: string;
	email?: string;
	picture?: string;
};

const getGoogleClientId = (env: Env | undefined) =>
	env?.GOOGLE_CLIENT_ID ||
	process.env.GOOGLE_CLIENT_ID ||
	process.env.PUBLIC_GOOGLE_CLIENT_ID ||
	'';

export const isGoogleAuthConfigured = (env: Env | undefined) => Boolean(getGoogleClientId(env));

export const verifyGoogleIdToken = async (idToken: string, env: Env | undefined) => {
	const clientId = getGoogleClientId(env);
	if (!clientId) {
		throw new Error('GOOGLE_CLIENT_ID is not configured');
	}

	const response = await fetch(
		`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
	);

	if (!response.ok) {
		throw new Error('Google ID token verification failed');
	}

	const payload = (await response.json()) as {
		aud?: string;
		sub?: string;
		name?: string;
		email?: string;
		picture?: string;
		email_verified?: string;
	};

	if (!payload.sub || payload.aud !== clientId) {
		throw new Error('Invalid Google ID token audience');
	}

	if (payload.email_verified === 'false') {
		throw new Error('Google email is not verified');
	}

	const profile: GoogleProfile = {
		sub: payload.sub,
		name: payload.name,
		email: payload.email,
		picture: payload.picture
	};

	return profile;
};
