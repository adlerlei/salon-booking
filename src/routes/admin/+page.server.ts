import type { PageServerLoad } from './$types';
import { getAdminRecord, listAdminBookings } from '$lib/server/admin';

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.lineUserId) {
		return {
			authState: 'needs-session' as const,
			lineUserId: null,
			adminName: '',
			records: []
		};
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);

	if (!adminRecord) {
		return {
			authState: 'forbidden' as const,
			lineUserId: locals.lineUserId,
			adminName: '',
			records: []
		};
	}

	return {
		authState: 'authorized' as const,
		lineUserId: locals.lineUserId,
		adminName: adminRecord.name,
		records: await listAdminBookings(platform)
	};
};
