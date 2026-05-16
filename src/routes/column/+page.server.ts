import type { PageServerLoad } from './$types';
import { listPublishedArticles } from '$lib/server/news';

export const load: PageServerLoad = async ({ platform }) => ({
	articles: await listPublishedArticles(platform)
});
