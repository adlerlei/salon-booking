import { error, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';

export const load = async ({ params, platform }) => {
	const token = params.token?.trim();
	if (!token) throw error(404, '找不到預約');

	const db = initDb(platform);
	const [booking] = await db.select().from(appointments).where(eq(appointments.manageToken, token));

	if (!booking) throw error(404, '找不到這筆預約或連結已失效');

	return {
		booking: {
			id: booking.id,
			customerName: booking.customerName,
			serviceType: booking.serviceType,
			appointmentDate: booking.appointmentDate,
			durationMinutes: booking.durationMinutes,
			partySize: booking.partySize,
			phone: booking.phone,
			status: booking.status
		},
		token
	};
};

export const actions = {
	cancel: async ({ params, platform }) => {
		const token = params.token?.trim();
		if (!token) return fail(400, { message: '缺少管理連結' });

		const db = initDb(platform);
		const [booking] = await db
			.select({ id: appointments.id, status: appointments.status })
			.from(appointments)
			.where(eq(appointments.manageToken, token));

		if (!booking) return fail(404, { message: '找不到這筆預約' });
		if (booking.status === 'cancelled') return { success: true, already: true };

		await db
			.update(appointments)
			.set({ status: 'cancelled' })
			.where(eq(appointments.manageToken, token));

		return { success: true };
	}
};
