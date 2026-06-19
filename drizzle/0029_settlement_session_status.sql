-- SETTLEMENT-ARCHITECTURE-1A — session settlement foundation migration
--
-- Legacy status migration assumption:
-- bill_requested and payment_pending represented in-progress dining (not settled).
-- Safest conversion: revert to open so staff can settle via markPaid/markComplimentary.
UPDATE `dining_sessions` SET `status` = 'open' WHERE `status` IN ('bill_requested', 'payment_pending');--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD COLUMN `settledAt` timestamp;--> statement-breakpoint
ALTER TABLE `dining_sessions` ADD COLUMN `settlementOutcome` enum('paid','complimentary');--> statement-breakpoint
ALTER TABLE `dining_sessions` MODIFY COLUMN `status` enum('open','paid','complimentary','closed') NOT NULL DEFAULT 'open';--> statement-breakpoint
ALTER TABLE `dining_sessions` DROP COLUMN `billRequestedAt`;--> statement-breakpoint
ALTER TABLE `dining_sessions` DROP COLUMN `paymentPendingAt`;
