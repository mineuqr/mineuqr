-- REGISTER-OPERATIONS-IMPLEMENTATION-1 / ADR-ARCH-030
-- Additive Register Duty plane + operator assignment on crmp_registers.
-- No Check / Settlement / Settlement Record / Reporting / Financial Shift ownership changes.
-- Production deployment NOT authorized by the implementation program alone.
-- TiDB: one statement per breakpoint.

ALTER TABLE `crmp_registers`
	ADD COLUMN `dutyStatus` enum('closed','open','suspended') NOT NULL DEFAULT 'closed';
--> statement-breakpoint
ALTER TABLE `crmp_registers`
	ADD COLUMN `assignedOperatorUserId` int NULL;
--> statement-breakpoint
ALTER TABLE `crmp_registers`
	ADD COLUMN `operatorAssignedAt` timestamp NULL;
--> statement-breakpoint
CREATE INDEX `crmp_registers_restaurant_duty` ON `crmp_registers` (`restaurantId`,`dutyStatus`);
