import { error } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load = async ({ url, platform }) => {
	// 由於 LIFF 是在前端取得 userId，我們會透過 API 參數傳遞，或是前端 fetch
	// 在這裡我們提供一個 API endpoint 等級的讀取方式
	const userId = url.searchParams.get('userId');
	if (!userId) {
		return { bookings: [] };
	}

	const db = initDb(platform);
	const userBookings = await db
		.select()
		.from(appointments)
		.where(eq(appointments.lineUserId, userId))
		.orderBy(desc(appointments.appointmentDate));

	return {
		bookings: userBookings
	};
};

export const actions = {
	cancel: async ({ request, platform }) => {
		const db = initDb(platform);
		const data = await request.formData();
		const appointmentId = data.get('appointmentId') as string;

		if (!appointmentId) {
			return { success: false, message: '缺少預約 ID' };
		}

		try {
			// 更新狀態為 cancelled
			await db
				.update(appointments)
				.set({ status: 'cancelled' })
				.where(eq(appointments.id, appointmentId));

			return { success: true };
		} catch (err: any) {
			return { success: false, message: err.message || '取消失敗' };
		}
	}
};
