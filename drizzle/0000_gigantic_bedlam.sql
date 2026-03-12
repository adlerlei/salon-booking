CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`service_type` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`appointment_date` text NOT NULL,
	`created_at` integer
);
