-- BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1
-- Check-owned frozen Charge lines. Additive. Not membership. Not a Payment aggregate.
-- Insert-only money fields (application repository has no UPDATE of charge amounts).
-- No FKs — application-level integrity, matches check_order_membership / settlement_records.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `check_charges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chargeId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`sequence` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` decimal(10,2) NOT NULL,
	`lineDiscount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`modifierAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`netAmount` decimal(10,2) NOT NULL,
	`taxCategory` varchar(64),
	`taxAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`currencyCode` varchar(8) NOT NULL,
	`originOrderId` int,
	`originOrderItemId` int,
	`originChannel` varchar(32),
	`originReference` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `check_charges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_charges_charge_id_unique` ON `check_charges` (`chargeId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_charges_check_sequence_unique` ON `check_charges` (`checkId`,`sequence`);
--> statement-breakpoint
CREATE INDEX `check_charges_restaurant_id` ON `check_charges` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_charges_check_id` ON `check_charges` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_charges_restaurant_check` ON `check_charges` (`restaurantId`,`checkId`);
--> statement-breakpoint
CREATE INDEX `check_charges_origin_order` ON `check_charges` (`restaurantId`,`originOrderId`);
