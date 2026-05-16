import { and, desc, eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { announcements, articles } from '$lib/server/db/schema';

export type AnnouncementRecord = typeof announcements.$inferSelect;
export type ArticleRecord = typeof articles.$inferSelect;

export const listActiveAnnouncements = async (
	platform: Readonly<App.Platform> | undefined,
	bookingOnly = false
) => {
	const db = initDb(platform);

	return db
		.select()
		.from(announcements)
		.where(
			and(
				eq(announcements.status, 'published'),
				bookingOnly ? eq(announcements.showOnBooking, true) : undefined
			)
		)
		.orderBy(desc(announcements.updatedAt));
};

export const listPublishedArticles = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);

	return db
		.select()
		.from(articles)
		.where(eq(articles.status, 'published'))
		.orderBy(desc(articles.publishedAt), desc(articles.updatedAt));
};

export const getPublishedArticleBySlug = async (
	platform: Readonly<App.Platform> | undefined,
	slug: string
) => {
	const db = initDb(platform);
	const [article] = await db
		.select()
		.from(articles)
		.where(and(eq(articles.slug, slug), eq(articles.status, 'published')));

	return article ?? null;
};

export const listAdminAnnouncements = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(announcements).orderBy(desc(announcements.updatedAt));
};

export const listAdminArticles = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(articles).orderBy(desc(articles.updatedAt));
};
