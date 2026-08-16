-- POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1
-- Logical POS Terminal identity. Not Device Management. Not CRMP Register.
-- Additive only. No existing rows are affected (new table).
-- Do not apply to Production until POS-DOMAIN-PRODUCTION-APPLY-1.

CREATE TABLE `pos_terminals` (
	`id` varchar(36) NOT NULL,
	`restaurantId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`lifecycle` enum('registered','active','deactivated','replaced') NOT NULL,
	`replacedByTerminalId` varchar(36),
	`optionalDeviceId` varchar(64),
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL,
	CONSTRAINT `pos_terminals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pos_terminals_restaurant_code_unique` ON `pos_terminals` (`restaurantId`,`code`);
--> statement-breakpoint
CREATE INDEX `pos_terminals_restaurant_lifecycle` ON `pos_terminals` (`restaurantId`,`lifecycle`);
