import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getAdminRecord } from '$lib/server/admin';
import { initDb } from '$lib/server/db';
import { announcements, articles } from '$lib/server/db/schema';
import { listAdminAnnouncements, listAdminArticles } from '$lib/server/news';

type ContentBody = Record<string, string | boolean | null | undefined>;

const stringOrNull = (value: string | boolean | null | undefined) =>
	typeof value === 'string' && value.trim() ? value.trim() : null;

const buildArticleSlug = (title: string) => {
	const normalized = title
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
	const suffix = Date.now().toString(36);
	return normalized ? `${normalized}-${suffix}` : `post-${suffix}`;
};

const requireAdmin = async (
	locals: App.Locals,
	platform: Readonly<App.Platform> | undefined
): Promise<{ lineUserId: string } | { error: Response }> => {
	if (!locals.lineUserId) {
		return { error: json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 }) };
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);
	if (!adminRecord) {
		return { error: json({ success: false, message: '沒有管理員權限' }, { status: 403 }) };
	}

	return { lineUserId: locals.lineUserId };
};

const listContent = async (platform: Readonly<App.Platform> | undefined) => ({
	announcements: await listAdminAnnouncements(platform),
	articles: await listAdminArticles(platform)
});

export async function GET({ locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	return json(
		{ success: true, ...(await listContent(platform)) },
		{
			headers: { 'Cache-Control': 'no-store' }
		}
	);
}

export async function POST({ request, locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	const body = (await request.json()) as ContentBody;
	const db = initDb(platform);
	const now = new Date();

	if (body.type === 'announcement') {
		const title = String(body.title || '公告').trim();
		const content = String(body.content || '').trim();
		if (!content) {
			return json({ success: false, message: '公告內容必填' }, { status: 400 });
		}

		await db.insert(announcements).values({
			title,
			content,
			status: 'published',
			startsAt: null,
			endsAt: null,
			isPinned: false,
			showOnBooking: true,
			createdBy: auth.lineUserId,
			createdAt: now,
			updatedAt: now
		});

		return json({ success: true, ...(await listContent(platform)) });
	}

	if (body.type === 'article') {
		const title = String(body.title || '').trim();
		const slug = buildArticleSlug(title);
		const excerpt = String(body.excerpt || '').trim();
		const content = String(body.content || '').trim();

		if (!title || !slug || !excerpt || !content) {
			return json({ success: false, message: '文章標題、摘要與內容必填' }, { status: 400 });
		}

		await db.insert(articles).values({
			title,
			slug,
			excerpt,
			content,
			coverImageUrl: null,
			status: 'published',
			publishedAt: now.toISOString(),
			createdBy: auth.lineUserId,
			createdAt: now,
			updatedAt: now
		});

		return json({ success: true, ...(await listContent(platform)) });
	}

	return json({ success: false, message: '不支援的內容類型' }, { status: 400 });
}

export async function PATCH({ request, locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	const body = (await request.json()) as ContentBody;
	const id = String(body.id || '');
	if (!id) return json({ success: false, message: '缺少內容 ID' }, { status: 400 });

	const db = initDb(platform);
	const now = new Date();

	if (body.type === 'announcement') {
		const title = String(body.title || '公告').trim();
		const content = String(body.content || '').trim();
		if (!content) {
			return json({ success: false, message: '公告內容必填' }, { status: 400 });
		}

		await db
			.update(announcements)
			.set({
				title,
				content,
				status: 'published',
				startsAt: null,
				endsAt: null,
				isPinned: false,
				showOnBooking: true,
				updatedAt: now
			})
			.where(eq(announcements.id, id));

		return json({ success: true, ...(await listContent(platform)) });
	}

	if (body.type === 'article') {
		const title = String(body.title || '').trim();
		const excerpt = String(body.excerpt || '').trim();
		const content = String(body.content || '').trim();
		if (!title || !excerpt || !content) {
			return json({ success: false, message: '文章標題、摘要與內容必填' }, { status: 400 });
		}

		const [existing] = await db
			.select({ slug: articles.slug })
			.from(articles)
			.where(eq(articles.id, id));
		const slug = existing?.slug || buildArticleSlug(title);

		await db
			.update(articles)
			.set({
				title,
				slug,
				excerpt,
				content,
				coverImageUrl: null,
				status: 'published',
				publishedAt: stringOrNull(body.publishedAt) || now.toISOString(),
				updatedAt: now
			})
			.where(eq(articles.id, id));

		return json({ success: true, ...(await listContent(platform)) });
	}

	return json({ success: false, message: '不支援的內容類型' }, { status: 400 });
}

export async function DELETE({ request, locals, platform }) {
	const auth = await requireAdmin(locals, platform);
	if ('error' in auth) return auth.error;

	const body = (await request.json()) as ContentBody;
	const id = String(body.id || '');
	if (!id) return json({ success: false, message: '缺少內容 ID' }, { status: 400 });

	const db = initDb(platform);
	if (body.type === 'announcement') {
		await db.delete(announcements).where(eq(announcements.id, id));
	} else if (body.type === 'article') {
		await db.delete(articles).where(eq(articles.id, id));
	} else {
		return json({ success: false, message: '不支援的內容類型' }, { status: 400 });
	}

	return json({ success: true, ...(await listContent(platform)) });
}
