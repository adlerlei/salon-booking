export const load = async ({ locals }) => {
	return {
		auth: locals.auth
	};
};

export const actions = {
	cancel: async () => ({ success: false, message: '請改用 API 取消預約' })
};
