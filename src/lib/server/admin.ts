import { eq } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { admins, appointments } from '$lib/server/db/schema';

type AdminBookingRecord = typeof appointments.$inferSelect;
export type AdminRecord = typeof admins.$inferSelect;

type ServiceStat = {
	serviceType: string;
	count: number;
};

type PeriodStats = {
	label: string;
	visitorCount: number;
	serviceStats: ServiceStat[];
};

export type AdminDashboardStats = {
	day: PeriodStats;
	week: PeriodStats;
	month: PeriodStats;
};

const parseAppointmentDate = (dateTime: string) => {
	const [datePart, timePart = '00:00'] = dateTime.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hour, minute] = timePart.split(':').map(Number);
	return new Date(year, month - 1, day, hour, minute);
};

const startOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const endOfDay = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const startOfWeek = (date: Date) => {
	const current = startOfDay(date);
	const day = current.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	current.setDate(current.getDate() + diff);
	return current;
};

const endOfWeek = (date: Date) => {
	const current = startOfWeek(date);
	current.setDate(current.getDate() + 6);
	current.setHours(23, 59, 59, 999);
	return current;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);

const endOfMonth = (date: Date) =>
	new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const formatServiceStats = (records: AdminBookingRecord[]): ServiceStat[] => {
	const counts = new Map<string, number>();

	for (const record of records) {
		counts.set(record.serviceType, (counts.get(record.serviceType) || 0) + 1);
	}

	return [...counts.entries()]
		.map(([serviceType, count]) => ({ serviceType, count }))
		.sort(
			(left, right) => right.count - left.count || left.serviceType.localeCompare(right.serviceType)
		);
};

const buildPeriodStats = (
	label: string,
	records: AdminBookingRecord[],
	rangeStart: Date,
	rangeEnd: Date
): PeriodStats => {
	const filtered = records.filter((record) => {
		if (record.status === 'cancelled') return false;

		const appointmentDate = parseAppointmentDate(record.appointmentDate);
		return appointmentDate >= rangeStart && appointmentDate <= rangeEnd;
	});

	return {
		label,
		visitorCount: filtered.length,
		serviceStats: formatServiceStats(filtered)
	};
};

export const getAdminRecord = async (
	platform: Readonly<App.Platform> | undefined,
	lineUserId: string | null
) => {
	if (!lineUserId) return null;

	const db = initDb(platform);
	const [adminRecord] = await db.select().from(admins).where(eq(admins.lineUserId, lineUserId));

	return adminRecord ?? null;
};

export const listAdminRecords = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(admins) as Promise<AdminRecord[]>;
};

export const listAdminBookings = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(appointments);
};

export const buildAdminDashboardStats = (
	records: AdminBookingRecord[],
	now = new Date()
): AdminDashboardStats => ({
	day: buildPeriodStats('今日', records, startOfDay(now), endOfDay(now)),
	week: buildPeriodStats('本週', records, startOfWeek(now), endOfWeek(now)),
	month: buildPeriodStats('本月', records, startOfMonth(now), endOfMonth(now))
});
