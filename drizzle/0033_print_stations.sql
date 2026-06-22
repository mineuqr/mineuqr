CREATE TABLE `print_stations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`printerId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_stations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `print_stations_restaurant_id` ON `print_stations` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `print_stations_printer_id` ON `print_stations` (`printerId`);--> statement-breakpoint
ALTER TABLE `categories` ADD `stationId` int;--> statement-breakpoint
ALTER TABLE `print_jobs` ADD `stationId` int;--> statement-breakpoint
CREATE INDEX `print_jobs_station_id` ON `print_jobs` (`stationId`);
