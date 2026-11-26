export type SalonService = {
	name: string;
	duration: number;
	desc: string;
};

/** 預約／官網／後台共用的服務資料（單一來源） */
export const salonServices: SalonService[] = [
	{ name: '男生單剪', duration: 20, desc: '約 20 分鐘' },
	{ name: '女生單剪', duration: 30, desc: '約 30 分鐘' },
	{ name: '男生洗剪', duration: 30, desc: '約 30 分鐘' },
	{ name: '女生洗剪', duration: 50, desc: '約 50 分鐘' },
	{ name: '男生染髮', duration: 90, desc: '約 1.5 小時' },
	{ name: '女生染髮', duration: 120, desc: '約 2 小時' },
	{ name: '男生燙髮', duration: 90, desc: '約 1.5 小時' },
	{ name: '女生燙髮', duration: 180, desc: '約 3 小時' },
	{ name: '洗髮+頭皮保養', duration: 40, desc: '約 40 分鐘' },
	{ name: '洗剪+頭皮保養', duration: 60, desc: '約 1 小時' },
	{ name: '護髮+洗髮', duration: 30, desc: '約 30 分鐘' },
	{ name: '護髮+剪髮+洗髮', duration: 60, desc: '約 1 小時' }
];

export const serviceDurations: Record<string, number> = Object.fromEntries(
	salonServices.map((service) => [service.name, service.duration])
);
