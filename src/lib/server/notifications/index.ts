import { notifyAdminsAboutNewBooking as notifyLineAboutNewBooking } from './line';
import { notifyWebPushAboutNewBooking } from './webpush';
import type { BookingNotificationPayload } from './message';

export type { BookingNotificationPayload } from './message';

/**
 * 雙通道：PWA Web Push + LINE（LINE 仍受月額度保護）。
 * 不做 Telegram。
 */
export const notifyAdminsAboutNewBooking = async (
	platform: Readonly<App.Platform> | undefined,
	payload: BookingNotificationPayload
) => {
	const results = await Promise.allSettled([
		notifyWebPushAboutNewBooking(platform, payload),
		notifyLineAboutNewBooking(platform, payload)
	]);

	const [webpush, line] = results.map((result) =>
		result.status === 'fulfilled'
			? result.value
			: { sent: false, reason: 'exception' as const, error: String(result.reason) }
	);

	return { webpush, line };
};
