const TAIPEI_TIME_ZONE = 'Asia/Taipei';

export const getTaipeiNowParts = (now = new Date()) => {
	const formatter = new Intl.DateTimeFormat('sv-SE', {
		timeZone: TAIPEI_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});

	const parts = Object.fromEntries(
		formatter.formatToParts(now).map((part) => [part.type, part.value])
	);

	return {
		year: Number(parts.year),
		month: Number(parts.month),
		day: Number(parts.day),
		hour: Number(parts.hour),
		minute: Number(parts.minute),
		dateString: `${parts.year}-${parts.month}-${parts.day}`,
		dateTimeString: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
	};
};

export const toTaipeiNowString = (now = new Date()) => getTaipeiNowParts(now).dateTimeString;

export const toTaipeiDateString = (now = new Date()) => getTaipeiNowParts(now).dateString;
