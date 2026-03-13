import { redirect } from '@sveltejs/kit';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';

// 服務對應的時間（分鐘）
const serviceDurations: Record<string, number> = {
	男生單剪: 20,
	女生單剪: 30,
	男生洗剪: 30,
	女生洗剪: 50,
	男生染髮: 120,
	女生染髮: 150, // 取 2.5 小時
	男生燙髮: 120,
	女生燙髮: 210, // 取 3.5 小時
	'洗髮+頭皮保養': 40,
	'洗剪+頭皮保養': 60
};

export const load = async ({ platform }) => {
	const db = initDb(platform);
	const allAppointments = await db.select().from(appointments);
	return {
		appointments: allAppointments
	};
};

export const actions = {
	default: async ({ request, platform }) => {
		const db = initDb(platform); // 初始化雲端 D1
		const data = await request.formData();
		const lineUserId = data.get('lineUserId') as string;
		const customerName = data.get('customerName') as string;
		const serviceType = data.get('serviceType') as string;
		const appointmentDate = data.get('appointmentDate') as string;

		const durationMinutes = serviceDurations[serviceType] || 60; // 預設 60 分鐘防呆

		await db.insert(appointments).values({
			lineUserId,
			customerName,
			serviceType,
			durationMinutes,
			appointmentDate,
			createdAt: new Date()
		});

		// 導向成功頁面，傳遞預約資訊作為 query params
		const params = new URLSearchParams({
			service: serviceType,
			date: appointmentDate,
			name: customerName,
			duration: String(durationMinutes)
		});
		redirect(303, `/booking-success?${params.toString()}`);
	}
};
