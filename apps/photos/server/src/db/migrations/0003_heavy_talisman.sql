CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`did` text NOT NULL,
	`full_key` text NOT NULL,
	`thumb_key` text NOT NULL,
	`content_type` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_photos_created_at` ON `photos` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_photos_did` ON `photos` (`did`);