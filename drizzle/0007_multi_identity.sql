CREATE TABLE `appointments_new` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text,
	`customer_name` text NOT NULL,
	`service_type` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`appointment_date` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`party_size` integer DEFAULT 1 NOT NULL,
	`services_json` text,
	`auth_provider` text DEFAULT 'line' NOT NULL,
	`auth_subject` text DEFAULT '' NOT NULL,
	`phone` text,
	`email` text,
	`source` text DEFAULT 'line' NOT NULL,
	`created_at` integer
);--> statement-breakpoint
INSERT INTO `appointments_new` (
	`id`,
	`line_user_id`,
	`customer_name`,
	`service_type`,
	`duration_minutes`,
	`appointment_date`,
	`status`,
	`party_size`,
	`services_json`,
	`auth_provider`,
	`auth_subject`,
	`phone`,
	`email`,
	`source`,
	`created_at`
)
SELECT
	`id`,
	`line_user_id`,
	`customer_name`,
	`service_type`,
	`duration_minutes`,
	`appointment_date`,
	`status`,
	`party_size`,
	`services_json`,
	'line',
	`line_user_id`,
	NULL,
	NULL,
	'line',
	`created_at`
FROM `appointments`;--> statement-breakpoint
DROP TABLE `appointments`;--> statement-breakpoint
ALTER TABLE `appointments_new` RENAME TO `appointments`;
