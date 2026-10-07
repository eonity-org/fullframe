ALTER TABLE `authors` ADD `notice_accepted_at` integer;--> statement-breakpoint
ALTER TABLE `authors` ADD `ai_consent_at` integer;--> statement-breakpoint
ALTER TABLE `authors` ADD `consent_version` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `description_required` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `suggestions_enabled` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `data_controller` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `data_contact` text;--> statement-breakpoint
ALTER TABLE `exhibitions` ADD `privacy_notes` text;--> statement-breakpoint
ALTER TABLE `submissions` ADD `suggested` integer DEFAULT false NOT NULL;