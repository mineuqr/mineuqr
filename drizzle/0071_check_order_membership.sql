-- CHECK-GENERALIZATION-M1-MEMBERSHIP-PERSISTENCE-1
-- ADR-ARCH-020 — Check-owned Order membership (not a separate aggregate).
-- Dual-write foundation only: Session discovery remains authoritative for money.
-- No cutover. No session optionality. No settlement/API/UI changes.

CREATE TABLE `check_order_membership` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`checkId` int NOT NULL,
	`orderId` int NOT NULL,
	`enrolledAt` timestamp NOT NULL,
	`enrolledReason` enum('session_attach','order_place','backfill','manual') NOT NULL DEFAULT 'session_attach',
	`active` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `check_order_membership_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_order_membership_check_order_unique` ON `check_order_membership` (`checkId`,`orderId`);
--> statement-breakpoint
CREATE INDEX `check_order_membership_restaurant_id` ON `check_order_membership` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `check_order_membership_check_id` ON `check_order_membership` (`checkId`);
--> statement-breakpoint
CREATE INDEX `check_order_membership_order_id` ON `check_order_membership` (`orderId`);
--> statement-breakpoint
CREATE INDEX `check_order_membership_restaurant_order` ON `check_order_membership` (`restaurantId`,`orderId`);
