import type { PageServerLoad } from './$types';
import { listActiveAnnouncements } from '$lib/server/news';

export const load: PageServerLoad = async ({ platform }) => ({
	announcements: await listActiveAnnouncements(platform)
});
