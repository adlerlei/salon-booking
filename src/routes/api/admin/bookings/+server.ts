import { json } from '@sveltejs/kit';
import { buildAdminDashboardStats, listAdminBookings, requireAdmin } from '$lib/server/admin';
import { getDbErrorMessage, isD1QuotaExceededError } from '$lib/server/db';

export async function GET({ locals, platform }) {
	try {
		const auth = await requireAdmin(locals, platform);
		if ('error' in auth) return auth.error;

		const records = await listAdminBookings(platform);
		return json({ success: true, records, stats: buildAdminDashboardStats(records) });
	} catch (err) {
		console.error('Failed to fetch admin bookings:', err);
		return json(
			{
				success: false,
				message: getDbErrorMessage(err, '後台資料更新失敗'),
				records: []
			},
			{ status: isD1QuotaExceededError(err) ? 503 : 500 }
		);
	}
}
