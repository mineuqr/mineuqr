-- SETTLEMENT-RECORD-IMPLEMENTATION-1 / ADR-ARCH-026
-- Immutable Canonical Financial Document storage (append-only write model).
-- Produced by Check Aggregate at financial finalization — NOT an Aggregate Root.
-- No business rules in SQL. No FKs (application-level integrity, matches OS/ST/MCA).
-- Uniqueness (restaurantId, checkId, recordKind, recordGeneration) guarantees SR-INV-05.
-- Money columns have no UPDATE path in application repositories (SR-INV-02).
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `settlement_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settlementRecordId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`recordKind` enum('settlement','refund','void','reversal','correction') NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 1,
	`recordGeneration` int NOT NULL,
	`checkId` int NOT NULL,
	`sessionId` int,
	`financialReference` varchar(128),
	`priorSettlementRecordId` varchar(128),
	`orderRefsJson` json NOT NULL,
	`orderSettlementRefsJson` json NOT NULL,
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`taxAmount` decimal(10,2) NOT NULL,
	`grandTotal` decimal(10,2) NOT NULL,
	`outcome` enum('paid','complimentary','voided') NOT NULL,
	`currencySnapshotJson` json NOT NULL,
	`taxPolicySnapshotJson` json NOT NULL,
	`taxBreakdownJson` json NOT NULL,
	`paymentSnapshotJson` json NOT NULL,
	`businessDay` varchar(10) NOT NULL,
	`settledAt` timestamp NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`createdByActorType` varchar(64),
	`createdByActorId` varchar(128),
	`producer` varchar(64) NOT NULL DEFAULT 'check_aggregate',
	CONSTRAINT `settlement_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settlement_records_record_id_unique` ON `settlement_records` (`settlementRecordId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `settlement_records_business_unique` ON `settlement_records` (`restaurantId`,`checkId`,`recordKind`,`recordGeneration`);
--> statement-breakpoint
CREATE INDEX `settlement_records_restaurant_id` ON `settlement_records` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `settlement_records_check_id` ON `settlement_records` (`checkId`);
--> statement-breakpoint
CREATE INDEX `settlement_records_restaurant_check` ON `settlement_records` (`restaurantId`,`checkId`);
--> statement-breakpoint
CREATE INDEX `settlement_records_session_id` ON `settlement_records` (`sessionId`);
--> statement-breakpoint
CREATE INDEX `settlement_records_business_day` ON `settlement_records` (`businessDay`);
--> statement-breakpoint
CREATE INDEX `settlement_records_financial_ref` ON `settlement_records` (`financialReference`);
--> statement-breakpoint
CREATE INDEX `settlement_records_prior_record_id` ON `settlement_records` (`priorSettlementRecordId`);
--> statement-breakpoint
CREATE INDEX `settlement_records_outcome` ON `settlement_records` (`outcome`);
--> statement-breakpoint
CREATE INDEX `settlement_records_record_kind` ON `settlement_records` (`recordKind`);
