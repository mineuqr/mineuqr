-- CRMP-IMPLEMENTATION-1 / ADR-ARCH-028
-- Cash Register Management Platform persistence (additive only).
-- No FKs to Check / Settlement / Settlement Record (application-level refs).
-- CRMP never owns Settlement money. TiDB: one statement per breakpoint.

CREATE TABLE `crmp_registers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`registerId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`displayName` varchar(128) NOT NULL,
	`status` enum('provisioned','active','inactive') NOT NULL,
	`deviceId` varchar(64),
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL,
	CONSTRAINT `crmp_registers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_registers_register_id_unique` ON `crmp_registers` (`registerId`);
--> statement-breakpoint
CREATE INDEX `crmp_registers_restaurant_id` ON `crmp_registers` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `crmp_registers_restaurant_status` ON `crmp_registers` (`restaurantId`,`status`);
--> statement-breakpoint
CREATE TABLE `crmp_financial_shifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`financialShiftId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`registerId` varchar(128) NOT NULL,
	`operatorUserId` int NOT NULL,
	`status` enum('open','handover_pending','closed') NOT NULL,
	`openingFloatAmount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`drawerId` varchar(128) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`openedAt` timestamp NOT NULL,
	`closedAt` timestamp NULL,
	`updatedAt` timestamp NOT NULL,
	CONSTRAINT `crmp_financial_shifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_financial_shifts_shift_id_unique` ON `crmp_financial_shifts` (`financialShiftId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_financial_shifts_drawer_id_unique` ON `crmp_financial_shifts` (`drawerId`);
--> statement-breakpoint
CREATE INDEX `crmp_financial_shifts_restaurant_id` ON `crmp_financial_shifts` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `crmp_financial_shifts_register_id` ON `crmp_financial_shifts` (`registerId`);
--> statement-breakpoint
CREATE INDEX `crmp_financial_shifts_register_status` ON `crmp_financial_shifts` (`registerId`,`status`);
--> statement-breakpoint
CREATE TABLE `crmp_drawer_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movementId` varchar(128) NOT NULL,
	`financialShiftId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`movementType` enum('opening_float','paid_in','paid_out','safe_drop','manual_adjustment') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`reason` varchar(512),
	`actorUserId` int NOT NULL,
	`recordedAt` timestamp NOT NULL,
	CONSTRAINT `crmp_drawer_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_drawer_movements_movement_id_unique` ON `crmp_drawer_movements` (`movementId`);
--> statement-breakpoint
CREATE INDEX `crmp_drawer_movements_shift_id` ON `crmp_drawer_movements` (`financialShiftId`);
--> statement-breakpoint
CREATE INDEX `crmp_drawer_movements_restaurant_id` ON `crmp_drawer_movements` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `crmp_drawer_counts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`countId` varchar(128) NOT NULL,
	`financialShiftId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`kind` enum('interim','final') NOT NULL,
	`expectedAmount` decimal(10,2) NOT NULL,
	`actualAmount` decimal(10,2) NOT NULL,
	`varianceAmount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`actorUserId` int NOT NULL,
	`recordedAt` timestamp NOT NULL,
	CONSTRAINT `crmp_drawer_counts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_drawer_counts_count_id_unique` ON `crmp_drawer_counts` (`countId`);
--> statement-breakpoint
CREATE INDEX `crmp_drawer_counts_shift_id` ON `crmp_drawer_counts` (`financialShiftId`);
--> statement-breakpoint
CREATE INDEX `crmp_drawer_counts_restaurant_id` ON `crmp_drawer_counts` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `crmp_shift_handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`handoverId` varchar(128) NOT NULL,
	`financialShiftId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`initiatorUserId` int NOT NULL,
	`receiverUserId` int NOT NULL,
	`outcome` enum('pending','accepted','rejected') NOT NULL,
	`finalCountId` varchar(128),
	`offeredAt` timestamp NOT NULL,
	`resolvedAt` timestamp NULL,
	CONSTRAINT `crmp_shift_handovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_shift_handovers_handover_id_unique` ON `crmp_shift_handovers` (`handoverId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_shift_handovers_shift_id_unique` ON `crmp_shift_handovers` (`financialShiftId`);
--> statement-breakpoint
CREATE INDEX `crmp_shift_handovers_restaurant_id` ON `crmp_shift_handovers` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `crmp_settlement_attributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attributionId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`registerId` varchar(128) NOT NULL,
	`financialShiftId` varchar(128) NOT NULL,
	`settlementRecordId` varchar(128) NOT NULL,
	`operatorUserId` int NOT NULL,
	`cashTenderAmount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`attributedAt` timestamp NOT NULL,
	CONSTRAINT `crmp_settlement_attributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_settlement_attributions_attr_id_unique` ON `crmp_settlement_attributions` (`attributionId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_settlement_attributions_sr_unique` ON `crmp_settlement_attributions` (`settlementRecordId`);
--> statement-breakpoint
CREATE INDEX `crmp_settlement_attributions_shift_id` ON `crmp_settlement_attributions` (`financialShiftId`);
--> statement-breakpoint
CREATE INDEX `crmp_settlement_attributions_register_id` ON `crmp_settlement_attributions` (`registerId`);
--> statement-breakpoint
CREATE INDEX `crmp_settlement_attributions_restaurant_id` ON `crmp_settlement_attributions` (`restaurantId`);
