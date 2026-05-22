CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`descriptionAr` text,
	`descriptionEn` text,
	`iconName` varchar(64),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`descriptionAr` text,
	`descriptionEn` text,
	`price` decimal(10,2) NOT NULL,
	`imageUrl` text,
	`isAvailable` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`calories` int
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleEn` varchar(255),
	`descriptionAr` text,
	`descriptionEn` text,
	`offerType` enum('daily','weekly','monthly') NOT NULL,
	`originalPrice` decimal(10,2) NOT NULL,
	`offerPrice` decimal(10,2) NOT NULL,
	`imageUrl` text,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `restaurants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`slug` varchar(128) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`descriptionAr` text,
	`descriptionEn` text,
	`logoUrl` text,
	`coverUrl` text,
	`phone` varchar(32),
	`address` text,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`viewCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`menuTemplate` varchar(32) NOT NULL DEFAULT 'classic',
	`customColors` text
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255) NOT NULL,
	`descriptionAr` text,
	`descriptionEn` text,
	`priceMonthly` decimal(10,2) NOT NULL,
	`priceYearly` decimal(10,2),
	`maxRestaurants` int NOT NULL DEFAULT 1,
	`maxItemsPerRestaurant` int NOT NULL DEFAULT 100,
	`maxCategories` int NOT NULL DEFAULT 10,
	`features` text,
	`stripePriceIdMonthly` varchar(255),
	`stripePriceIdYearly` varchar(255),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`planId` int NOT NULL,
	`status` enum('active','canceled','expired','trial') NOT NULL DEFAULT 'trial',
	`billingCycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`trialEndsAt` timestamp,
	`canceledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE INDEX `restaurants_slug_unique` ON `restaurants` (`slug`);--> statement-breakpoint
CREATE INDEX `users_openId_unique` ON `users` (`openId`);