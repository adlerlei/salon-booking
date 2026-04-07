import type { PageServerLoad } from './$types';
import {
	buildAdminDashboardStats,
	getAdminRecord,
	listAdminBookings
} from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.lineUserId) {
		return {
			authState: 'needs-session' as const,
			lineUserId: null,
			adminName: '',
			records: [],
			stats: null
		};
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);

	if (!adminRecord) {
		return {
			authState: 'forbidden' as const,
			lineUserId: locals.lineUserId,
			adminName: '',
			records: [],
			stats: null
		};
	}

	const records = await listAdminBookings(platform);

	return {
		authState: 'authorized' as const,
		lineUserId: locals.lineUserId,
		adminName: adminRecord.name,
		records,
		stats: buildAdminDashboardStats(records)
	};
};
