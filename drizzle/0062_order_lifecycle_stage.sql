-- ORDER-LIFECYCLE-ARCHIVE-1 — lifecycle stage as independent order dimension
ALTER TABLE `orders`
  ADD COLUMN `lifecycleStage` enum('active','completed','archived') NOT NULL DEFAULT 'active' AFTER `status`,
  ADD INDEX `orders_lifecycle_stage` (`lifecycleStage`);

UPDATE `orders`
SET `lifecycleStage` = 'completed'
WHERE `status` IN ('served', 'cancelled');

ALTER TABLE `order_read_orders`
  ADD COLUMN `lifecycleStage` enum('active','completed','archived') NOT NULL DEFAULT 'active' AFTER `status`,
  ADD INDEX `order_read_orders_restaurant_lifecycle` (`restaurantId`, `lifecycleStage`);

UPDATE `order_read_orders`
SET `lifecycleStage` = 'completed'
WHERE `status` IN ('served', 'cancelled') OR `isActive` = false;
