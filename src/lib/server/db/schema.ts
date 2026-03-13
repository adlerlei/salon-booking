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
	status: text('status', { enum: ['confirmed', 'cancelled'] }).notNull().default('confirmed'),
	createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});
