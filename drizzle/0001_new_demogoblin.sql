ALTER TABLE `categories` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `menu_items` MODIFY COLUMN `isAvailable` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `offers` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `restaurants` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;--> statement-breakpoint
ALTER TABLE `subscription_plans` MODIFY COLUMN `isActive` boolean NOT NULL DEFAULT true;