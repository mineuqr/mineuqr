-- MULTI-CHECK-ALLOCATION-PERSISTENCE-1 / ADR-ARCH-025
-- Check-owned Multi Check Allocation persistence (Domain entity storage only).
-- No business rules. No FKs (application-level integrity, matches Split Payment / OS / Check).
-- Canonical domain identities (allocationId, portionId, …) are stored explicitly;
-- surrogate `id` never replaces them.
-- History is append-only audit: never overwrite historical allocation mutation rows.
-- Adjustments / reversals / sources / portions are insert-if-absent by canonical id.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `multi_check_allocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`allocationReference` varchar(128) NOT NULL,
	`financialReference` varchar(128),
	`sourceCheckId` int NOT NULL,
	`sourcePaymentId` varchar(128),
	`status` enum('pending','reserved','applied','adjusted','reversed','completed','cancelled') NOT NULL DEFAULT 'pending',
	`financialResponsibility` decimal(10,2) NOT NULL DEFAULT '0.00',
	`allocatedAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`remainingAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`paymentValueCap` decimal(10,2),
	`schemaVersion` int NOT NULL DEFAULT 1,
	`version` int NOT NULL DEFAULT 1,
	`allocationReason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_allocation_id_unique` ON `multi_check_allocations` (`allocationId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_restaurant_alloc_ref_unique` ON `multi_check_allocations` (`restaurantId`,`allocationReference`);
--> statement-breakpoint
CREATE INDEX `mca_restaurant_id` ON `multi_check_allocations` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `mca_source_check_id` ON `multi_check_allocations` (`sourceCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_restaurant_source_check` ON `multi_check_allocations` (`restaurantId`,`sourceCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_source_payment_id` ON `multi_check_allocations` (`sourcePaymentId`);
--> statement-breakpoint
CREATE INDEX `mca_financial_ref` ON `multi_check_allocations` (`financialReference`);
--> statement-breakpoint
CREATE INDEX `mca_status` ON `multi_check_allocations` (`status`);
--> statement-breakpoint
CREATE INDEX `mca_version` ON `multi_check_allocations` (`version`);
--> statement-breakpoint
CREATE TABLE `multi_check_allocation_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`sourceCheckId` int NOT NULL,
	`sourcePaymentId` varchar(128),
	`financialReference` varchar(128),
	`responsibilityAmount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocation_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_sources_alloc_check_unique` ON `multi_check_allocation_sources` (`allocationId`,`sourceCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_sources_allocation_id` ON `multi_check_allocation_sources` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `mca_sources_source_check_id` ON `multi_check_allocation_sources` (`sourceCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_sources_restaurant_id` ON `multi_check_allocation_sources` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `multi_check_allocation_portions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`portionId` varchar(128) NOT NULL,
	`allocationSequence` int NOT NULL,
	`targetCheckId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`applied` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocation_portions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_portions_portion_id_unique` ON `multi_check_allocation_portions` (`portionId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_portions_alloc_sequence_unique` ON `multi_check_allocation_portions` (`allocationId`,`allocationSequence`);
--> statement-breakpoint
CREATE INDEX `mca_portions_allocation_id` ON `multi_check_allocation_portions` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `mca_portions_target_check_id` ON `multi_check_allocation_portions` (`targetCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_portions_restaurant_id` ON `multi_check_allocation_portions` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `mca_portions_alloc_sequence` ON `multi_check_allocation_portions` (`allocationId`,`allocationSequence`);
--> statement-breakpoint
CREATE TABLE `multi_check_allocation_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`adjustmentId` varchar(128) NOT NULL,
	`portionId` varchar(128),
	`amount` decimal(10,2) NOT NULL,
	`direction` enum('increase','decrease') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocation_adjustments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_adjustments_adjustment_id_unique` ON `multi_check_allocation_adjustments` (`adjustmentId`);
--> statement-breakpoint
CREATE INDEX `mca_adjustments_allocation_id` ON `multi_check_allocation_adjustments` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `mca_adjustments_restaurant_id` ON `multi_check_allocation_adjustments` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `multi_check_allocation_reversals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`reversalId` varchar(128) NOT NULL,
	`reversedAmount` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocation_reversals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mca_reversals_reversal_id_unique` ON `multi_check_allocation_reversals` (`reversalId`);
--> statement-breakpoint
CREATE INDEX `mca_reversals_allocation_id` ON `multi_check_allocation_reversals` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `mca_reversals_restaurant_id` ON `multi_check_allocation_reversals` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `multi_check_allocation_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`allocationId` varchar(128) NOT NULL,
	`allocationReference` varchar(128) NOT NULL,
	`financialReference` varchar(128),
	`sourceCheckId` int NOT NULL,
	`targetCheckId` int,
	`sourcePaymentId` varchar(128),
	`previousRevision` int NOT NULL,
	`newRevision` int NOT NULL,
	`mutationType` enum('create','reserve','apply','adjust','reverse','complete','cancel','update') NOT NULL,
	`status` enum('pending','reserved','applied','adjusted','reversed','completed','cancelled') NOT NULL,
	`financialResponsibility` decimal(10,2) NOT NULL,
	`allocatedAmount` decimal(10,2) NOT NULL,
	`remainingAmount` decimal(10,2) NOT NULL,
	`allocationReason` varchar(255),
	`schemaVersion` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `multi_check_allocation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `mca_history_allocation_id` ON `multi_check_allocation_history` (`allocationId`);
--> statement-breakpoint
CREATE INDEX `mca_history_restaurant_id` ON `multi_check_allocation_history` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `mca_history_alloc_revision` ON `multi_check_allocation_history` (`allocationId`,`newRevision`);
--> statement-breakpoint
CREATE INDEX `mca_history_financial_ref` ON `multi_check_allocation_history` (`financialReference`);
--> statement-breakpoint
CREATE INDEX `mca_history_source_check_id` ON `multi_check_allocation_history` (`sourceCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_history_target_check_id` ON `multi_check_allocation_history` (`targetCheckId`);
--> statement-breakpoint
CREATE INDEX `mca_history_mutation_type` ON `multi_check_allocation_history` (`mutationType`);
--> statement-breakpoint
CREATE INDEX `mca_history_created_at` ON `multi_check_allocation_history` (`createdAt`);
