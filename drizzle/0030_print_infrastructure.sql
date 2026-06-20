CREATE TABLE `printers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`paperWidthMm` int NOT NULL,
	`profileId` varchar(64) NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `printers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `printers_restaurant_id` ON `printers` (`restaurantId`);--> statement-breakpoint
CREATE TABLE `restaurant_print_settings` (
	`restaurantId` int NOT NULL,
	`ticketLocale` enum('ar','en','bilingual') NOT NULL DEFAULT 'bilingual',
	`autoPrintOnNewOrder` boolean NOT NULL DEFAULT true,
	`showTotalAmount` boolean NOT NULL DEFAULT true,
	`defaultPrinterId` int,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `restaurant_print_settings_restaurant_id` PRIMARY KEY(`restaurantId`)
);
--> statement-breakpoint
CREATE TABLE `print_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`orderId` int NOT NULL,
	`printerId` int,
	`status` enum('queued','claimed','printed','failed','cancelled','expired') NOT NULL DEFAULT 'queued',
	`attemptCount` int NOT NULL DEFAULT 0,
	`idempotencyKey` varchar(128) NOT NULL,
	`claimedBy` int,
	`leaseExpiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `print_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `print_jobs_restaurant_id` ON `print_jobs` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `print_jobs_order_id` ON `print_jobs` (`orderId`);--> statement-breakpoint
CREATE INDEX `print_jobs_printer_id` ON `print_jobs` (`printerId`);--> statement-breakpoint
CREATE INDEX `print_jobs_status` ON `print_jobs` (`status`);--> statement-breakpoint
CREATE INDEX `print_jobs_idempotency_key` ON `print_jobs` (`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `print_jobs_restaurant_id_status_created_at` ON `print_jobs` (`restaurantId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `print_job_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`printJobId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`metadataJson` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `print_job_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `print_job_attempts_print_job_id` ON `print_job_attempts` (`printJobId`);
