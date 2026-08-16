-- POS-SALE-ORDER-IMPLEMENTATION-1
-- Idempotency map for POS Sale -> canonical Order.
-- Not a POS Order table. Not Check/Settlement/Register persistence.
-- Additive only. No existing rows are affected (new table).
-- Do not apply to Production until a separate Production Apply program.

CREATE TABLE `pos_sale_idempotency` (
	`id` varchar(36) NOT NULL,
	`restaurantId` int NOT NULL,
	`terminalId` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`orderId` int NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`trackingToken` varchar(64) NOT NULL,
	`displayReference` varchar(64) NOT NULL,
	`totalAmount` varchar(16) NOT NULL,
	`itemCount` int NOT NULL,
	`createdAt` timestamp NOT NULL,
	CONSTRAINT `pos_sale_idempotency_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pos_sale_idempotency_unique` ON `pos_sale_idempotency` (`restaurantId`,`terminalId`,`userId`,`idempotencyKey`);
--> statement-breakpoint
CREATE INDEX `pos_sale_idempotency_order` ON `pos_sale_idempotency` (`orderId`);
