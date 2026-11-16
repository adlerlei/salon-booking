import type { PageServerLoad } from './$types';
import { buildAdminDashboardStats, getAdminRecord, listAdminBookings } from '$lib/server/admin';
import { getDbErrorMessage } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.lineUserId) {
		return {
			authState: 'needs-session' as const,
			lineUserId: null,
			adminName: '',
			records: [],
			stats: null,
			errorMessage: ''
		};
	}

	try {
		const adminRecord = await getAdminRecord(platform, locals.lineUserId);

		if (!adminRecord) {
			return {
				authState: 'forbidden' as const,
				lineUserId: locals.lineUserId,
				adminName: '',
				records: [],
				stats: null,
				errorMessage: ''
			};
		}

		const records = await listAdminBookings(platform);

		return {
			authState: 'authorized' as const,
			lineUserId: locals.lineUserId,
			adminName: adminRecord.name,
			records,
			stats: buildAdminDashboardStats(records),
			errorMessage: ''
		};
	} catch (err) {
		console.error('Failed to load admin dashboard:', err);
		return {
			authState: 'error' as const,
			lineUserId: locals.lineUserId,
			adminName: '',
			records: [],
			stats: null,
			errorMessage: getDbErrorMessage(err, '後台資料載入失敗，請稍後再試。')
		};
	}
};
