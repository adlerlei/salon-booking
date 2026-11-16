import { drizzle } from 'drizzle-orm/d1';
import { dev } from '$app/environment';

export let db: any;

export const isD1QuotaExceededError = (error: unknown) => {
	const msg = error instanceof Error ? error.message : String(error ?? '');
	return msg.includes('7500') || msg.toLowerCase().includes('daily row read limit');
};

export const getDbErrorMessage = (error: unknown, fallback: string) => {
	if (isD1QuotaExceededError(error)) {
		return 'Cloudflare D1 資料庫已達今日免費讀取上限（帳號層級 500 萬列/日），請檢查同帳號下其他資料庫用量、升級方案，或待 UTC 午夜重置後再試。';
	}
	return fallback;
};

export const initDb = (platform: Readonly<App.Platform> | undefined) => {
	// 移除 if (db) return db; 以避免 Drizzle 快取住舊的 SQL 結構（開發階段 HMR 常見問題）
	// if (db) return db;

	// 如果在本地開發環境且沒有綁定 D1，可以維持原有的 local sqlite 邏輯
	// 但為了部署一致性，我們直接抓取 Cloudflare 綁定
	if (platform?.env?.salon_booking_db) {
		db = drizzle(platform.env.salon_booking_db);
	} else {
		throw new Error('Database binding not found');
	}
	return db;
};
