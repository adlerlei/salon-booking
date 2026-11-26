import { json } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { ownershipCondition } from '$lib/server/bookings';

export async function GET({ locals, platform }) {
	if (!locals.auth) {
		return json({ bookings: [] }, { status: 401 });
	}

	const db = initDb(platform);
	const userBookings = await db
		.select()
		.from(appointments)
		.where(ownershipCondition(locals.auth))
		.orderBy(desc(appointments.appointmentDate));

	return json({ bookings: userBookings });
}

export async function POST({ request, locals, platform }) {
	if (!locals.auth) {
		return json({ success: false, message: '請先完成登入或身分驗證' }, { status: 401 });
	}

	const db = initDb(platform);
	const { appointmentId } = (await request.json()) as { appointmentId: string };

	if (!appointmentId) {
		return json({ success: false, message: '缺少預約 ID' }, { status: 400 });
	}

	try {
		const booking = await db
			.select({ id: appointments.id })
			.from(appointments)
			.where(and(eq(appointments.id, appointmentId), ownershipCondition(locals.auth)));

		if (booking.length === 0) {
			return json({ success: false, message: '找不到這筆預約' }, { status: 404 });
		}

		await db
			.update(appointments)
			.set({ status: 'cancelled' })
			.where(and(eq(appointments.id, appointmentId), ownershipCondition(locals.auth)));

		return json({ success: true });
	} catch (err: any) {
		return json({ success: false, message: err.message || '取消失敗' }, { status: 500 });
	}
}
