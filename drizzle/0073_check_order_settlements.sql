-- ORDER-SETTLEMENT-PERSISTENCE-1 / ADR-ARCH-022
-- Check-owned Order Settlement persistence (Domain entity storage only).
-- No business rules. No FKs (application-level integrity, matches Membership/Check).
-- Unique (checkId, orderId) supports I-OS-01 and safe create retries (ADR-021).
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `check_order_settlements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('pending','partially_settled','settled','complimentary','cancelled','voided','refunded') NOT NULL DEFAULT 'pending',
	`orderTotalSnapshot` decimal(10,2) NOT NULL DEFAULT '0.00',
	`allocatedAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`settledAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`outstandingAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_order_settlements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_order_settlements_check_order_unique` ON `check_order_settlements` (`checkId`,`orderId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_restaurant_id` ON `check_order_settlements` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_check_id` ON `check_order_settlements` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_order_id` ON `check_order_settlements` (`orderId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_restaurant_order` ON `check_order_settlements` (`restaurantId`,`orderId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_restaurant_check` ON `check_order_settlements` (`restaurantId`,`checkId`);
--> statement-breakpoint
CREATE INDEX `check_order_settlements_status` ON `check_order_settlements` (`status`);
