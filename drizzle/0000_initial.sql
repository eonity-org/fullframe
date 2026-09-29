CREATE TABLE `authors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exhibition_id` integer NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`token` text,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`exhibition_id`) REFERENCES `exhibitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `authors_token_hash_unique` ON `authors` (`token_hash`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`juror_id` integer NOT NULL,
	`resource_hash` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`juror_id`) REFERENCES `jurors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `criteria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exhibition_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scale_max` integer DEFAULT 5 NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`exhibition_id`) REFERENCES `exhibitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exhibitions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`organization_id` text,
	`organization_name` text,
	`vault_hash` text,
	`vault_url` text,
	`vault_base_url` text,
	`appearance` text,
	`selected_hashes` text,
	`read_vault_key` text,
	`write_vault_key` text,
	`phase` text DEFAULT 'setup' NOT NULL,
	`submissions` text DEFAULT 'pending' NOT NULL,
	`submission_limit` integer DEFAULT 5 NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`welcome_content` text,
	`cover_image` text,
	`writeback_at` integer,
	`scoring_record` text,
	`opened_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exhibitions_slug_unique` ON `exhibitions` (`slug`);--> statement-breakpoint
CREATE TABLE `jurors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exhibition_id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`token_hash` text NOT NULL,
	`token` text,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`exhibition_id`) REFERENCES `exhibitions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jurors_token_hash_unique` ON `jurors` (`token_hash`);--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`author_id` integer NOT NULL,
	`resource_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `authors`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submissions_resource_hash_unique` ON `submissions` (`resource_hash`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`juror_id` integer NOT NULL,
	`criterion_id` integer NOT NULL,
	`resource_hash` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`juror_id`) REFERENCES `jurors`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`criterion_id`) REFERENCES `criteria`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_juror_work_criterion` ON `votes` (`juror_id`,`resource_hash`,`criterion_id`);