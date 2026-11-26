ALTER TABLE `appointments` ADD `manage_token` text;--> statement-breakpoint
CREATE UNIQUE INDEX `appointments_manage_token_unique` ON `appointments` (`manage_token`);
