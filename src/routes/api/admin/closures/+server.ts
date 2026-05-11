import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { closures } from '$lib/server/db/schema';
import { getAdminRecord } from '$lib/server/admin';

export async function GET({ platform }) {
	const db = initDb(platform);
	const all = await db.select().from(closures);
	return json({ success: true, closures: all }, {
		headers: { 'Cache-Control': 'no-store' }
	});
}

export async function POST({ request, locals, platform }) {
	if (!locals.lineUserId) {
		return json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 });
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);
	if (!adminRecord) {
		return json({ success: false, message: '沒有管理員權限' }, { status: 403 });
	}

	const body = await request.json();
	const { dates, date, startTime, endTime, reason } = body as {
		dates?: string[];
		date?: string;
		startTime?: string;
		endTime?: string;
		reason?: string;
	};

	const dateList = dates ?? (date ? [date] : []);

	if (dateList.length === 0) {
		return json({ success: false, message: '請至少選擇一個日期' }, { status: 400 });
	}

	const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
	for (const d of dateList) {
		if (!dateRegex.test(d)) {
			return json({ success: false, message: `日期格式不正確：${d}` }, { status: 400 });
		}
	}

	if ((startTime && !endTime) || (!startTime && endTime)) {
		return json({ success: false, message: '開始與結束時間需同時填寫' }, { status: 400 });
	}

	if (startTime && endTime && startTime >= endTime) {
		return json({ success: false, message: '結束時間必須晚於開始時間' }, { status: 400 });
	}

	if (startTime && (startTime < '11:00' || startTime > '20:00')) {
		return json({ success: false, message: '開始時間須在營業時間 11:00-20:00 內' }, { status: 400 });
	}
	if (endTime && (endTime < '11:00' || endTime > '20:00')) {
		return json({ success: false, message: '結束時間須在營業時間 11:00-20:00 內' }, { status: 400 });
	}

	const db = initDb(platform);
	for (const d of dateList) {
		await db.insert(closures).values({
			date: d,
			startTime: startTime || null,
			endTime: endTime || null,
			reason: reason || null,
			createdBy: locals.lineUserId
		});
	}

	const all = await db.select().from(closures);
	return json({ success: true, closures: all });
}

export async function DELETE({ request, locals, platform }) {
	if (!locals.lineUserId) {
		return json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 });
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);
	if (!adminRecord) {
		return json({ success: false, message: '沒有管理員權限' }, { status: 403 });
	}

	const body = await request.json();
	const { id } = body as { id: string };

	if (!id) {
		return json({ success: false, message: '缺少公休 ID' }, { status: 400 });
	}

	const db = initDb(platform);
	await db.delete(closures).where(eq(closures.id, id));

	const all = await db.select().from(closures);
	return json({ success: true, closures: all });
}
