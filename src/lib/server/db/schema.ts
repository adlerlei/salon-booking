import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const appointments = sqliteTable('appointments', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	lineUserId: text('line_user_id').notNull(),
	customerName: text('customer_name').notNull(),
	serviceType: text('service_type').notNull(), // 例如：剪髮、染髮
	durationMinutes: integer('duration_minutes').notNull(), // The length of the service in minutes (e.g. 30, 60, 180)
	appointmentDate: text('appointment_date').notNull(), // 格式：YYYY-MM-DD HH:MM
	status: text('status', { enum: ['confirmed', 'cancelled'] })
		.notNull()
		.default('confirmed'),
	partySize: integer('party_size').notNull().default(1),
	servicesJson: text('services_json'), // JSON array: [{service, duration}, ...] for multi-person bookings
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

export const admins = sqliteTable('admins', {
	lineUserId: text('line_user_id').primaryKey(), // LINE User ID 為主鍵
	name: text('name').notNull(), // 管理員名稱或備註
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const notificationStates = sqliteTable('notification_states', {
	key: text('key').primaryKey(),
	period: text('period').notNull(),
	isPaused: integer('is_paused', { mode: 'boolean' }).notNull().default(false),
	warningSentAt: integer('warning_sent_at', { mode: 'timestamp' }),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
