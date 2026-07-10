-- ORDER-IDENTITY-AND-BUSINESS-DAY-1: operational display identity (no PK/FK migration)
-- ORDER-READ-REGRESSION-1B: align SQL identifiers with MineuQR camelCase convention (orders/read tables).

ALTER TABLE `orders`
  ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;

CREATE TABLE `order_business_day_sequences` (
  `restaurant_id` int NOT NULL,
  `business_day` varchar(10) NOT NULL,
  `last_number` int unsigned NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurant_id`, `business_day`)
);

ALTER TABLE `order_read_orders`
  ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;

ALTER TABLE `order_read_public_order_status`
  ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;

CREATE UNIQUE INDEX `uq_orders_restaurant_business_day_display`
  ON `orders` (`restaurantId`, `businessDay`, `daily_display_number`);
