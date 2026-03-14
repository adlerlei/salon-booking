import { json } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET({ url, platform }) {
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return json({ bookings: [] });
	}

	const db = initDb(platform);
	const userBookings = await db
		.select()
		.from(appointments)
		.where(eq(appointments.lineUserId, userId))
		.orderBy(desc(appointments.appointmentDate));

	return json({ bookings: userBookings });
}

export async function POST({ request, platform }) {
	const db = initDb(platform);
	const { appointmentId } = (await request.json()) as { appointmentId: string };

	if (!appointmentId) {
		return json({ success: false, message: '缺少預約 ID' }, { status: 400 });
	}

	try {
		await db
			.update(appointments)
			.set({ status: 'cancelled' })
			.where(eq(appointments.id, appointmentId));

		return json({ success: true });
	} catch (err: any) {
		return json({ success: false, message: err.message || '取消失敗' }, { status: 500 });
	}
}
