import { json } from '@sveltejs/kit';
import { getAdminRecord, listAdminBookings } from '$lib/server/admin';

export async function GET({ locals, platform }) {
	if (!locals.lineUserId) {
		return json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 });
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);

	if (!adminRecord) {
		return json({ success: false, message: '沒有管理員權限', records: [] }, { status: 403 });
	}

	return json({ success: true, records: await listAdminBookings(platform) });
}
