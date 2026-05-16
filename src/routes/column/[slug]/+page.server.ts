import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPublishedArticleBySlug } from '$lib/server/news';

export const load: PageServerLoad = async ({ params, platform }) => {
	const article = await getPublishedArticleBySlug(platform, params.slug);
	if (!article) throw error(404, '文章不存在或尚未發布');

	return { article };
};
