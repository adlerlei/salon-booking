import { and, eq, gte } from 'drizzle-orm';
import type { AuthIdentity } from '$lib/server/auth/types';
import { appointments } from '$lib/server/db/schema';
import { toTaipeiNowString } from '$lib/server/time';

export const ownershipCondition = (auth: AuthIdentity) =>
	and(eq(appointments.authProvider, auth.provider), eq(appointments.authSubject, auth.subject));

/** 訪客：同一手機已有未來已確認預約則限制再約 */
export const countFutureConfirmedByPhone = async (
	db: ReturnType<typeof import('$lib/server/db').initDb>,
	phone: string
) => {
	const now = toTaipeiNowString();
	const rows = await db
		.select({ id: appointments.id })
		.from(appointments)
		.where(
			and(
				eq(appointments.phone, phone),
				eq(appointments.status, 'confirmed'),
				gte(appointments.appointmentDate, now)
			)
		);
	return rows.length;
};
