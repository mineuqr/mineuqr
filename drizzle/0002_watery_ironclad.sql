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
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_subscriptions_id` PRIMARY KEY(`id`)
);
