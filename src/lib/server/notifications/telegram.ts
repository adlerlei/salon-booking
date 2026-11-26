import {
	buildBookingNotificationText,
	DEFAULT_ADMIN_DASHBOARD_URL,
	type BookingNotificationPayload
} from './message';

const getEnv = (env: Env | undefined, key: 'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID') =>
	env?.[key] || process.env[key] || '';

export const isTelegramConfigured = (env: Env | undefined) =>
	Boolean(getEnv(env, 'TELEGRAM_BOT_TOKEN') && getEnv(env, 'TELEGRAM_CHAT_ID'));

export const notifyTelegramAboutNewBooking = async (
	platform: Readonly<App.Platform> | undefined,
	payload: BookingNotificationPayload
) => {
	const token = getEnv(platform?.env, 'TELEGRAM_BOT_TOKEN');
	const chatId = getEnv(platform?.env, 'TELEGRAM_CHAT_ID');

	if (!token || !chatId) {
		return { sent: false, reason: 'missing_config' as const };
	}

	const adminUrl =
		platform?.env?.LINE_NOTIFICATION_ADMIN_URL ||
		process.env.LINE_NOTIFICATION_ADMIN_URL ||
		DEFAULT_ADMIN_DASHBOARD_URL;

	const text = buildBookingNotificationText(payload, adminUrl);

	const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text,
			disable_web_page_preview: true
		})
	});

	if (!response.ok) {
		const body = await response.text();
		console.error('Telegram sendMessage failed', response.status, body);
		return { sent: false, reason: 'api_error' as const };
	}

	return { sent: true, reason: 'telegram_sent' as const };
};
