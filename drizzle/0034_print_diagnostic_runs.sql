CREATE TABLE `print_diagnostic_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`diagnosticId` varchar(64) NOT NULL,
	`restaurantId` int NOT NULL,
	`printerId` int NOT NULL,
	`agentId` varchar(128),
	`triggeredByUserId` int NOT NULL,
	`triggeredByLabel` varchar(256) NOT NULL,
	`status` enum('pending','accepted','completed','failed') NOT NULL DEFAULT 'pending',
	`error` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `print_diagnostic_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `print_diagnostic_runs_diagnostic_id_unique` ON `print_diagnostic_runs` (`diagnosticId`);--> statement-breakpoint
CREATE INDEX `print_diagnostic_runs_restaurant_id` ON `print_diagnostic_runs` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `print_diagnostic_runs_printer_id` ON `print_diagnostic_runs` (`printerId`);--> statement-breakpoint
CREATE INDEX `print_diagnostic_runs_status_created_at` ON `print_diagnostic_runs` (`status`,`createdAt`);
