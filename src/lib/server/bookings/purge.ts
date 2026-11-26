import { and, eq, lt } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { appointments } from '$lib/server/db/schema';
import { toTaipeiDateString } from '$lib/server/time';

/**
 * 只清除「已取消」且預約日已過的資料。
 * 已完成（confirmed）一律保留，供本週／本月與之後業績統計使用。
 */
export const purgeExpiredCancelledAppointments = async (
	platform: Readonly<App.Platform> | undefined
) => {
	const db = initDb(platform);
	const today = toTaipeiDateString();

	const deleted = await db
		.delete(appointments)
		.where(and(eq(appointments.status, 'cancelled'), lt(appointments.appointmentDate, today)))
		.returning({ id: appointments.id });

	return deleted.length;
};
