const PHONE_PATTERN = /^09\d{8}$/;

export const normalizeTaiwanMobile = (raw: string) => {
	const digits = raw.replace(/\D/g, '');
	if (digits.length === 10 && digits.startsWith('09')) return digits;
	if (digits.length === 9 && digits.startsWith('9')) return `0${digits}`;
	if (digits.length === 12 && digits.startsWith('8869')) return `0${digits.slice(3)}`;
	return digits;
};

export const isValidTaiwanMobile = (phone: string) => PHONE_PATTERN.test(phone);

export const createGuestSubject = () => crypto.randomUUID();
