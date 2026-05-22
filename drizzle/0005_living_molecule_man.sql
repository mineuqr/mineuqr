CREATE TABLE `item_addons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuItemId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`price` decimal(10,2) NOT NULL,
	`isOptional` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `item_addons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `item_sizes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`menuItemId` int NOT NULL,
	`restaurantId` int NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`priceModifier` decimal(10,2) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `item_sizes_id` PRIMARY KEY(`id`)
);
