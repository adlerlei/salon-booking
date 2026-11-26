import { json } from '@sveltejs/kit';
import { eq, gte } from 'drizzle-orm';
import { initDb } from '$lib/server/db';
import { admins, appointments } from '$lib/server/db/schema';
import { getTaipeiNowParts } from '$lib/server/time';

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

const toTaipeiWallDate = (now = new Date()) => {
	const parts = getTaipeiNowParts(now);
	return new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
};

const formatDateKey = (date: Date) =>
	`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const formatServiceStats = (records: AdminBookingRecord[]): ServiceStat[] => {
	const counts = new Map<string, number>();

	for (const record of records) {
		if (record.servicesJson) {
			try {
				const items = JSON.parse(record.servicesJson) as { service?: unknown }[];
				if (Array.isArray(items) && items.length > 0) {
					for (const item of items) {
						const name =
							typeof item?.service === 'string' && item.service.trim()
								? item.service
								: record.serviceType;
						counts.set(name, (counts.get(name) || 0) + 1);
					}
					continue;
				}
			} catch {
				// fallthrough to serviceType
			}
		}
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

export const requireAdmin = async (
	locals: App.Locals,
	platform: Readonly<App.Platform> | undefined
): Promise<{ lineUserId: string; adminRecord: AdminRecord } | { error: Response }> => {
	if (!locals.lineUserId) {
		return { error: json({ success: false, message: '請先完成 LINE 驗證' }, { status: 401 }) };
	}

	const adminRecord = await getAdminRecord(platform, locals.lineUserId);
	if (!adminRecord) {
		return { error: json({ success: false, message: '沒有管理員權限' }, { status: 403 }) };
	}

	return { lineUserId: locals.lineUserId, adminRecord };
};

export const listAdminRecords = async (platform: Readonly<App.Platform> | undefined) => {
	const db = initDb(platform);
	return db.select().from(admins) as Promise<AdminRecord[]>;
};

export const listAdminBookings = async (
	platform: Readonly<App.Platform> | undefined,
	now = new Date()
) => {
	const { purgeExpiredCancelledAppointments } = await import('$lib/server/bookings/purge');
	await purgeExpiredCancelledAppointments(platform).catch((error) => {
		console.error('Failed to purge expired cancelled appointments', error);
	});

	const db = initDb(platform);
	const taipeiNow = toTaipeiWallDate(now);
	const weekStart = startOfWeek(taipeiNow);
	const monthStart = startOfMonth(taipeiNow);
	const earliest = weekStart < monthStart ? weekStart : monthStart;

	return db
		.select()
		.from(appointments)
		.where(gte(appointments.appointmentDate, formatDateKey(earliest)));
};

export const buildAdminDashboardStats = (
	records: AdminBookingRecord[],
	now = new Date()
): AdminDashboardStats => {
	const taipeiNow = toTaipeiWallDate(now);
	return {
		day: buildPeriodStats('今日', records, startOfDay(taipeiNow), endOfDay(taipeiNow)),
		week: buildPeriodStats('本週', records, startOfWeek(taipeiNow), endOfWeek(taipeiNow)),
		month: buildPeriodStats('本月', records, startOfMonth(taipeiNow), endOfMonth(taipeiNow))
	};
};
