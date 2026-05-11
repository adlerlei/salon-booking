import { json } from '@sveltejs/kit';
import { gte } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { closures } from '$lib/server/db/schema';

export async function GET({ platform }) {
	const db = initDb(platform);

	const now = new Date();
	const today = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Taipei',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);

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
}
