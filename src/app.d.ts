// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	interface Env {
		LINE_SESSION_SECRET?: string;
		LINE_CHANNEL_ACCESS_TOKEN?: string;
		LINE_NOTIFICATION_MONTHLY_LIMIT?: string;
		LINE_NOTIFICATION_ADMIN_URL?: string;
	}

	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties;
		}

		// interface Error {}
		interface Locals {
			lineUserId: string | null;
		}
		// interface PageData {}
		// interface PageState {}
	}
}

export {};
