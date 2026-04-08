CREATE TABLE `notification_states` (
	`key` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`is_paused` integer DEFAULT false NOT NULL,
	`warning_sent_at` integer,
	`updated_at` integer NOT NULL
);
