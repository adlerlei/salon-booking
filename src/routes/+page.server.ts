import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyLineIdToken } from '$lib/server/auth/line';

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
	const allAppointments = await db
		.select({
			appointmentDate: appointments.appointmentDate,
			durationMinutes: appointments.durationMinutes
		})
		.from(appointments)
		.where(eq(appointments.status, 'confirmed'));
	return {
		appointments: allAppointments
	};
};

export const actions = {
	default: async ({ request, platform }) => {
		try {
			const data = await request.formData();
			const idToken = data.get('idToken') as string;
			const serviceType = data.get('serviceType') as string;
			const appointmentDate = data.get('appointmentDate') as string;

			if (!idToken) {
				return {
					success: false,
					message: '缺少 LINE 驗證資訊'
				};
			}

			const profile = await verifyLineIdToken(idToken, platform?.env);
			const durationMinutes = serviceDurations[serviceType] || 60; // 預設 60 分鐘防呆
			const db = initDb(platform);

			await db.insert(appointments).values({
				lineUserId: profile.sub,
				customerName: profile.name || 'LINE 使用者',
				serviceType,
				durationMinutes,
				appointmentDate,
				createdAt: new Date()
			});

			// 回傳成功資料給前端，由前端用 goto() 做客戶端導航
			// 這樣可以保留 LIFF 的瀏覽器上下文，讓 liff.closeWindow() 正常運作
			return {
				success: true,
				service: serviceType,
				date: appointmentDate,
				name: profile.name || 'LINE 使用者',
				duration: String(durationMinutes)
			};
		} catch (error) {
			return {
				success: false,
				message: '預約失敗，請重新登入 LINE 後再試一次'
			};
		}
	}
};
