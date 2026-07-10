-- ORDER-IDENTITY-AND-BUSINESS-DAY-1: operational display identity (no PK/FK migration)

ALTER TABLE `orders`
  ADD COLUMN `business_day` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `business_day`;

CREATE TABLE `order_business_day_sequences` (
  `restaurant_id` int NOT NULL,
  `business_day` varchar(10) NOT NULL,
  `last_number` int unsigned NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurant_id`, `business_day`)
);

ALTER TABLE `order_read_orders`
  ADD COLUMN `business_day` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `business_day`;

ALTER TABLE `order_read_public_order_status`
  ADD COLUMN `business_day` varchar(10) NULL AFTER `orderNumber`,
  ADD COLUMN `daily_display_number` int unsigned NULL AFTER `business_day`;

CREATE UNIQUE INDEX `uq_orders_restaurant_business_day_display`
  ON `orders` (`restaurant_id`, `business_day`, `daily_display_number`);
