import { notifyAdminsAboutNewBooking as notifyLineAboutNewBooking } from './line';
import { notifyTelegramAboutNewBooking } from './telegram';
import { notifyWebPushAboutNewBooking } from './webpush';
import type { BookingNotificationPayload } from './message';

export type { BookingNotificationPayload } from './message';

/**
 * 並行發送：Telegram、Web Push、LINE（LINE 仍受月額度保護）。
 * 任一通道失敗不影響其他通道。
 */
export const notifyAdminsAboutNewBooking = async (
	platform: Readonly<App.Platform> | undefined,
	payload: BookingNotificationPayload
) => {
	const results = await Promise.allSettled([
		notifyTelegramAboutNewBooking(platform, payload),
		notifyWebPushAboutNewBooking(platform, payload),
		notifyLineAboutNewBooking(platform, payload)
	]);

	const [telegram, webpush, line] = results.map((result) =>
		result.status === 'fulfilled'
			? result.value
			: { sent: false, reason: 'exception' as const, error: String(result.reason) }
	);

	return { telegram, webpush, line };
};
