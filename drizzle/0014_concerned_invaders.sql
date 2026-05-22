CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`menuItemId` int NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`nameEn` varchar(255),
	`price` decimal(10,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`tableId` int NOT NULL,
	`tableNumber` int NOT NULL,
	`customerName` varchar(255),
	`customerPhone` varchar(32),
	`status` enum('pending','preparing','ready','served','cancelled') NOT NULL DEFAULT 'pending',
	`notes` text,
	`totalAmount` decimal(10,2) NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`whatsappSent` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `restaurant_holidays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`titleEn` varchar(255),
	`date` varchar(10) NOT NULL,
	`isFullDayClosed` boolean NOT NULL DEFAULT true,
	`openTime` varchar(5),
	`closeTime` varchar(5),
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `restaurant_tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`tableNumber` int NOT NULL,
	`nameAr` varchar(100),
	`nameEn` varchar(100),
	`qrCodeUrl` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `restaurants` ADD `workingHours` text;--> statement-breakpoint
ALTER TABLE `restaurants` ADD `temporaryClosure` text;--> statement-breakpoint
CREATE INDEX `order_items_order_id` ON `order_items` (`orderId`);--> statement-breakpoint
CREATE INDEX `orders_restaurant_id` ON `orders` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `orders_table_id` ON `orders` (`tableId`);--> statement-breakpoint
CREATE INDEX `orders_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `restaurant_tables_restaurant_id` ON `restaurant_tables` (`restaurantId`);