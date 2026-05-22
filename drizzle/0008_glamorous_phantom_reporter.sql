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
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
