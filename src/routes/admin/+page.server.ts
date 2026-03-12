import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export async function load({ platform }) {
	const db = initDb(platform);
	const records = await db.select().from(appointments).orderBy(desc(appointments.appointmentDate));
	return { records };
}
