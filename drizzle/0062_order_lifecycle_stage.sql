-- ORDER-LIFECYCLE-ARCHIVE-1 — lifecycle stage as independent order dimension
-- MIGRATION-COMPATIBILITY-0062-1: statement-breakpoint markers for TiDB single-statement execution.

ALTER TABLE `orders`
  ADD COLUMN `lifecycleStage` enum('active','completed','archived') NOT NULL DEFAULT 'active' AFTER `status`;
--> statement-breakpoint
CREATE INDEX `orders_lifecycle_stage` ON `orders` (`lifecycleStage`);
--> statement-breakpoint
UPDATE `orders`
SET `lifecycleStage` = 'completed'
WHERE `status` IN ('served', 'cancelled');
--> statement-breakpoint
ALTER TABLE `order_read_orders`
  ADD COLUMN `lifecycleStage` enum('active','completed','archived') NOT NULL DEFAULT 'active' AFTER `status`;
--> statement-breakpoint
CREATE INDEX `order_read_orders_restaurant_lifecycle` ON `order_read_orders` (`restaurantId`, `lifecycleStage`);
--> statement-breakpoint
UPDATE `order_read_orders`
SET `lifecycleStage` = 'completed'
WHERE `status` IN ('served', 'cancelled') OR `isActive` = false;
