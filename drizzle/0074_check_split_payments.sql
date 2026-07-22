-- SPLIT-PAYMENT-PERSISTENCE-1 / ADR-ARCH-024
-- Check-owned Split Payment persistence (Domain entity storage only).
-- No business rules. No FKs (application-level integrity, matches OS/Membership/Check).
-- Canonical domain identities (paymentId, attemptId, …) are stored explicitly;
-- surrogate `id` never replaces them.
-- Payment Attempts are historical rows: unique attemptId; no reuse/overwrite of identity.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `check_split_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`paymentId` varchar(128) NOT NULL,
	`paymentReference` varchar(128) NOT NULL,
	`financialReference` varchar(128),
	`status` enum('pending','authorized','captured','partially_applied','applied','cancelled','voided','refunded','failed') NOT NULL DEFAULT 'pending',
	`amount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`allocatedAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`unallocatedAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_split_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payments_payment_id_unique` ON `check_split_payments` (`paymentId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payments_check_payment_unique` ON `check_split_payments` (`checkId`,`paymentId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payments_check_payment_ref_unique` ON `check_split_payments` (`checkId`,`paymentReference`);
--> statement-breakpoint
CREATE INDEX `check_split_payments_restaurant_id` ON `check_split_payments` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_split_payments_check_id` ON `check_split_payments` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payments_restaurant_check` ON `check_split_payments` (`restaurantId`,`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payments_financial_ref` ON `check_split_payments` (`financialReference`);
--> statement-breakpoint
CREATE INDEX `check_split_payments_status` ON `check_split_payments` (`status`);
--> statement-breakpoint
CREATE TABLE `check_split_payment_tenders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`paymentId` varchar(128) NOT NULL,
	`tenderId` varchar(128) NOT NULL,
	`method` varchar(32) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `check_split_payment_tenders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payment_tenders_tender_id_unique` ON `check_split_payment_tenders` (`tenderId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payment_tenders_payment_tender_unique` ON `check_split_payment_tenders` (`paymentId`,`tenderId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tenders_payment_id` ON `check_split_payment_tenders` (`paymentId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tenders_check_id` ON `check_split_payment_tenders` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tenders_restaurant_id` ON `check_split_payment_tenders` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `check_split_payment_tender_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`paymentId` varchar(128) NOT NULL,
	`tenderAllocationId` varchar(128) NOT NULL,
	`tenderId` varchar(128) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `check_split_payment_tender_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payment_tender_alloc_id_unique` ON `check_split_payment_tender_allocations` (`tenderAllocationId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tender_alloc_payment_id` ON `check_split_payment_tender_allocations` (`paymentId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tender_alloc_check_id` ON `check_split_payment_tender_allocations` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_tender_alloc_restaurant_id` ON `check_split_payment_tender_allocations` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `check_split_payment_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`paymentId` varchar(128) NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`orderId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `check_split_payment_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payment_allocations_alloc_id_unique` ON `check_split_payment_allocations` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_allocations_payment_id` ON `check_split_payment_allocations` (`paymentId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_allocations_check_id` ON `check_split_payment_allocations` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_allocations_order_id` ON `check_split_payment_allocations` (`orderId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_allocations_restaurant_id` ON `check_split_payment_allocations` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `check_split_payment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`attemptId` varchar(128) NOT NULL,
	`paymentId` varchar(128),
	`status` enum('started','succeeded','failed','cancelled') NOT NULL DEFAULT 'started',
	`amount` decimal(10,2) NOT NULL,
	`method` varchar(32) NOT NULL,
	`externalProviderReference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_split_payment_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_split_payment_attempts_attempt_id_unique` ON `check_split_payment_attempts` (`attemptId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_attempts_payment_id` ON `check_split_payment_attempts` (`paymentId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_attempts_check_id` ON `check_split_payment_attempts` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_attempts_restaurant_id` ON `check_split_payment_attempts` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_split_payment_attempts_check_created` ON `check_split_payment_attempts` (`checkId`,`createdAt`);
