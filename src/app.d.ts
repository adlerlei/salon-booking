declare global {
	const __APP_VERSION__: string;

	interface Env {
		LINE_SESSION_SECRET?: string;
		LINE_CHANNEL_ACCESS_TOKEN?: string;
		LINE_NOTIFICATION_MONTHLY_LIMIT?: string;
		LINE_NOTIFICATION_ADMIN_URL?: string;
		TURNSTILE_SECRET_KEY?: string;
		PUBLIC_TURNSTILE_SITE_KEY?: string;
		WEB_PUSH_VAPID_PUBLIC_KEY?: string;
		WEB_PUSH_VAPID_PRIVATE_KEY?: string;
		WEB_PUSH_VAPID_SUBJECT?: string;
	}

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		interface Locals {
			auth: import('$lib/server/auth/types').AuthIdentity | null;
			/** LINE 管理員白名單用；僅 provider=line 時有值 */
			lineUserId: string | null;
		}
	}
}

export {};
