import { drizzle } from 'drizzle-orm/d1';
import { dev } from '$app/environment';

export let db: any;

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
