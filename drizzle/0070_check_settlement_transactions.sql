-- CHECK-SETTLEMENT-METHODS-1
-- Settlement tender lines owned by Check aggregate.
-- Revenue SSOT remains operational_checks.grandTotal where outcome = paid.
-- No payment gateway integration.

CREATE TABLE `check_settlement_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`sessionId` int NOT NULL,
	`paymentMethod` varchar(32) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`status` enum('captured','pending','voided','refunded') NOT NULL DEFAULT 'captured',
	`businessTimestamp` timestamp NOT NULL,
	`reference` varchar(128) NULL,
	`externalReference` varchar(128) NULL,
	`notes` text NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_settlement_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `check_settlement_tx_restaurant_id` ON `check_settlement_transactions` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_settlement_tx_check_id` ON `check_settlement_transactions` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_settlement_tx_session_id` ON `check_settlement_transactions` (`sessionId`);
--> statement-breakpoint
CREATE INDEX `check_settlement_tx_payment_method` ON `check_settlement_transactions` (`paymentMethod`);
--> statement-breakpoint
CREATE INDEX `check_settlement_tx_business_ts` ON `check_settlement_transactions` (`businessTimestamp`);
