-- REGISTER-CATALOG-MANAGEMENT-1 / ADR-ARCH-030
-- Additive Register Catalog plane fields on crmp_registers.
-- No Check / Settlement / Settlement Record / Reporting / Financial Shift / Duty ownership changes.
-- Production deployment NOT authorized by the implementation program alone.
-- TiDB: one statement per breakpoint.

ALTER TABLE `crmp_registers`
	ADD COLUMN `code` varchar(64) NULL;
--> statement-breakpoint
ALTER TABLE `crmp_registers`
	ADD COLUMN `registerType` enum('settlement_station','counter','mobile_pos') NOT NULL DEFAULT 'counter';
--> statement-breakpoint
ALTER TABLE `crmp_registers`
	ADD COLUMN `archivedAt` timestamp NULL;
--> statement-breakpoint
UPDATE `crmp_registers`
	SET `code` = CONCAT('R', `id`)
	WHERE `code` IS NULL OR `code` = '';
--> statement-breakpoint
ALTER TABLE `crmp_registers`
	MODIFY COLUMN `code` varchar(64) NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_registers_restaurant_code_unique` ON `crmp_registers` (`restaurantId`,`code`);
--> statement-breakpoint
CREATE INDEX `crmp_registers_restaurant_type` ON `crmp_registers` (`restaurantId`,`registerType`);
