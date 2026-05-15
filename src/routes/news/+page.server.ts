import type { PageServerLoad } from './$types';
import { listActiveAnnouncements, listPublishedArticles } from '$lib/server/news';

export const load: PageServerLoad = async ({ platform }) => {
	const [announcements, articles] = await Promise.all([
		listActiveAnnouncements(platform),
		listPublishedArticles(platform)
	]);

	return {
		announcements,
		articles
	};
};
