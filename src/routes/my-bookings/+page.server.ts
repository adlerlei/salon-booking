import { isGoogleAuthConfigured } from '$lib/server/auth/google';

export const load = async ({ locals, platform }) => {
	const googleClientId =
		platform?.env?.GOOGLE_CLIENT_ID ||
		process.env.GOOGLE_CLIENT_ID ||
		process.env.PUBLIC_GOOGLE_CLIENT_ID ||
		'';

	return {
		auth: locals.auth,
		googleEnabled: isGoogleAuthConfigured(platform?.env),
		googleClientId
	};
};

export const actions = {
	cancel: async () => ({ success: false, message: '請改用 API 取消預約' })
};
