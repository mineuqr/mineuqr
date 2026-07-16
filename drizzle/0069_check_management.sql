-- CHECK-MANAGEMENT-ARCHITECTURE-1
-- Check sub-domain under Operational Session Platform + Business Tax Settings.
-- Check id is independent of Session id. No Split Check. No accounting ledger.

ALTER TABLE `restaurants` ADD COLUMN `taxEnabled` boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE `restaurants` ADD COLUMN `taxMode` enum('inclusive','exclusive') NOT NULL DEFAULT 'exclusive';
--> statement-breakpoint
ALTER TABLE `restaurants` ADD COLUMN `taxPolicyJson` text NULL;
--> statement-breakpoint
CREATE TABLE `operational_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`sessionId` int NOT NULL,
	`outcome` enum('open','paid','complimentary','voided') NOT NULL DEFAULT 'open',
	`currencySnapshotJson` json NOT NULL,
	`taxPolicySnapshotJson` json NOT NULL,
	`serviceChargeSnapshotJson` json NULL,
	`billDiscountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`subtotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`taxAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`taxBreakdownJson` json NOT NULL,
	`grandTotal` decimal(10,2) NOT NULL DEFAULT '0.00',
	`snapshotsFrozenAt` timestamp NOT NULL,
	`totalsFrozenAt` timestamp NULL,
	`settledAt` timestamp NULL,
	`voidedAt` timestamp NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `operational_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `operational_checks_restaurant_id` ON `operational_checks` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `operational_checks_session_id` ON `operational_checks` (`sessionId`);
--> statement-breakpoint
CREATE INDEX `operational_checks_outcome` ON `operational_checks` (`outcome`);
--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD COLUMN `activeCheckId` int NULL;
--> statement-breakpoint
CREATE INDEX `dining_sessions_active_check_id` ON `dining_sessions` (`activeCheckId`);
