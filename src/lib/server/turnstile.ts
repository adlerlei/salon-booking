const getSecret = (env: Env | undefined) =>
	env?.TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY || '';

export const isTurnstileConfigured = (env: Env | undefined) => Boolean(getSecret(env));

/**
 * 未設定 Secret 時直接通過（方便開發）。
 * 已設定時必須帶有效 token。
 */
export const verifyTurnstileToken = async (
	token: string | undefined,
	env: Env | undefined,
	remoteIp?: string | null
) => {
	const secret = getSecret(env);
	if (!secret) {
		return { ok: true, skipped: true as const };
	}

	if (!token) {
		return { ok: false, skipped: false as const, message: '請完成防機器人驗證' };
	}

	const body = new URLSearchParams({
		secret,
		response: token
	});
	if (remoteIp) body.set('remoteip', remoteIp);

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body
	});

	if (!response.ok) {
		return { ok: false, skipped: false as const, message: '防機器人驗證暫時無法使用' };
	}

	const result = (await response.json()) as { success?: boolean };
	if (!result.success) {
		return { ok: false, skipped: false as const, message: '防機器人驗證失敗，請重試' };
	}

	return { ok: true, skipped: false as const };
};

export const getTurnstileSiteKey = (env?: Env) =>
	env?.PUBLIC_TURNSTILE_SITE_KEY || process.env.PUBLIC_TURNSTILE_SITE_KEY || '';
