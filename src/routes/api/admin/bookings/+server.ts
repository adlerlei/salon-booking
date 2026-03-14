import { json } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments, admins } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ url, platform }) {
	const userId = url.searchParams.get('userId');
	
	if (!userId) {
		return json({ success: false, message: 'Missing user ID' }, { status: 401 });
	}

	const db = initDb(platform);
	
	// 驗證是否在白名單內
	const adminRecord = await db.select().from(admins).where(eq(admins.lineUserId, userId));
	
	if (adminRecord.length === 0) {
		return json({ success: false, message: 'Permission denied', records: [] }, { status: 403 });
	}

	// 權限驗證通過，撈取所有預約紀錄
	const allRecords = await db.select().from(appointments);
	return json({ success: true, records: allRecords });
}
