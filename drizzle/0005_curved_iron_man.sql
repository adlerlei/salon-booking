CREATE TABLE `closures` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`start_time` text,
	`end_time` text,
	`reason` text,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL
);
