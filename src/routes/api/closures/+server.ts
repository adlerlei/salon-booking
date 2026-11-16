import { json } from '@sveltejs/kit';
import { gte } from 'drizzle-orm';
import { getDbErrorMessage, initDb, isD1QuotaExceededError } from '$lib/server/db';
import { closures } from '$lib/server/db/schema';
import { toTaipeiDateString } from '$lib/server/time';

export async function GET({ platform }) {
	try {
		const db = initDb(platform);
		const today = toTaipeiDateString();

		const result = await db
			.select({
				date: closures.date,
				startTime: closures.startTime,
				endTime: closures.endTime,
				reason: closures.reason
			})
			.from(closures)
			.where(gte(closures.date, today));

		return json({ closures: result });
	} catch (err) {
		console.error('Failed to fetch closures:', err);
		return json(
			{ closures: [], message: getDbErrorMessage(err, '公休資料載入失敗') },
			{ status: isD1QuotaExceededError(err) ? 503 : 500 }
		);
	}
}
