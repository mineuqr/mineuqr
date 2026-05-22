ALTER TABLE `user_subscriptions` ADD `restaurantId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_plans` DROP COLUMN `featuresEn`;