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

export const closures = sqliteTable('closures', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	date: text('date').notNull(),
	startTime: text('start_time'),
	endTime: text('end_time'),
	reason: text('reason'),
	createdBy: text('created_by').notNull(),
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

export const announcements = sqliteTable('announcements', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	content: text('content').notNull(),
	status: text('status', { enum: ['draft', 'published'] })
		.notNull()
		.default('draft'),
	startsAt: text('starts_at'),
	endsAt: text('ends_at'),
	isPinned: integer('is_pinned', { mode: 'boolean' }).notNull().default(false),
	showOnBooking: integer('show_on_booking', { mode: 'boolean' }).notNull().default(false),
	createdBy: text('created_by').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export const articles = sqliteTable('articles', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	excerpt: text('excerpt').notNull(),
	content: text('content').notNull(),
	coverImageUrl: text('cover_image_url'),
	status: text('status', { enum: ['draft', 'published'] })
		.notNull()
		.default('draft'),
	publishedAt: text('published_at'),
	createdBy: text('created_by').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});
