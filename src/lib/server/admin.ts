import { eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { admins, appointments } from '$lib/server/db/schema';

export const getAdminRecord = async (
	platform: Readonly<App.Platform> | undefined,
	lineUserId: string | null
) => {
	if (!lineUserId) return null;

	const db = initDb(platform);
	const [adminRecord] = await db
		.select()
		.from(admins)
		.where(eq(admins.lineUserId, lineUserId));

	return adminRecord ?? null;
};

export const listAdminBookings = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(appointments);
};
