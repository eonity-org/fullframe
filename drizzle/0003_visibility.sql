ALTER TABLE `exhibitions` ADD `visibility` text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `on_home` integer DEFAULT true NOT NULL;