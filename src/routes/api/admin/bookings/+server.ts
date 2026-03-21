import { json } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments, admins } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ locals, platform }) {
	if (!locals.lineUserId) {
		return json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 });
	}

	const db = initDb(platform);

	const adminRecord = await db.select().from(admins).where(eq(admins.lineUserId, locals.lineUserId));

	if (adminRecord.length === 0) {
		return json({ success: false, message: '沒有管理員權限', records: [] }, { status: 403 });
	}

	const allRecords = await db.select().from(appointments);
	return json({ success: true, records: allRecords });
}
