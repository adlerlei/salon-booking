import type { BookingSource } from '$lib/server/auth/types';

export type BookingNotificationPayload = {
	customerName: string;
	serviceType: string;
	durationMinutes: number;
	appointmentDate: string;
	source?: BookingSource;
	phone?: string | null;
};

const SOURCE_LABEL: Record<BookingSource, string> = {
	line: 'LINE',
	guest: '網頁訪客'
};

const formatBookingDateTime = (appointmentDate: string) => {
	const [datePart, timePart = '00:00'] = appointmentDate.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hour, minute] = timePart.split(':').map(Number);
	const date = new Date(year, month - 1, day, hour, minute);

	return new Intl.DateTimeFormat('zh-TW', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		weekday: 'short',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	}).format(date);
};

const formatEndTime = (appointmentDate: string, durationMinutes: number) => {
	const [datePart, timePart = '00:00'] = appointmentDate.split('T');
	const [year, month, day] = datePart.split('-').map(Number);
	const [hour, minute] = timePart.split(':').map(Number);
	const end = new Date(year, month - 1, day, hour, minute + durationMinutes);
	const h = String(end.getHours()).padStart(2, '0');
	const m = String(end.getMinutes()).padStart(2, '0');
	return `${h}:${m}`;
};

export const buildBookingNotificationText = (
	payload: BookingNotificationPayload,
	adminUrl: string
) => {
	const startTime = payload.appointmentDate.split('T')[1] || '';
	const endTime = formatEndTime(payload.appointmentDate, payload.durationMinutes);
	const lines = [
		'【新預約】',
		payload.customerName,
		payload.serviceType.replaceAll('・', '\n'),
		formatBookingDateTime(payload.appointmentDate),
		`${startTime} ~ ${endTime}`
	];

	if (payload.source) {
		lines.push(`來源：${SOURCE_LABEL[payload.source]}`);
	}
	if (payload.phone) {
		lines.push(`手機：${payload.phone}`);
	}

	lines.push(`後台：${adminUrl}`);
	return lines.join('\n');
};

export const DEFAULT_ADMIN_DASHBOARD_URL = 'https://liff.line.me/2009342816-q0rukZhq/admin';
