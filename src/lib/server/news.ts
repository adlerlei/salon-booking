import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { announcements, articles } from '$lib/server/db/schema';

export type AnnouncementRecord = typeof announcements.$inferSelect;
export type ArticleRecord = typeof articles.$inferSelect;

const nowString = () => {
	const formatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone: 'Asia/Taipei',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});
	const parts = Object.fromEntries(
		formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
	);
	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

export const listActiveAnnouncements = async (
	platform: Readonly<App.Platform> | undefined,
	bookingOnly = false
) => {
	const db = initDb(platform);
	const now = nowString();

	return db
		.select()
		.from(announcements)
		.where(
			and(
				eq(announcements.status, 'published'),
				bookingOnly ? eq(announcements.showOnBooking, true) : undefined,
				or(isNull(announcements.startsAt), lte(announcements.startsAt, now)),
				or(isNull(announcements.endsAt), gte(announcements.endsAt, now))
			)
		)
		.orderBy(desc(announcements.isPinned), desc(announcements.updatedAt));
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
