-- ORDER-IDENTITY-AND-BUSINESS-DAY-1: operational display identity (no PK/FK migration)
-- ORDER-READ-REGRESSION-1B: align SQL identifiers with MineuQR camelCase convention (orders/read tables).
-- ORDER-READ-REGRESSION-1D: statement-breakpoint markers for TiDB single-statement execution.

ALTER TABLE `orders` ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;
--> statement-breakpoint
CREATE TABLE `order_business_day_sequences` (
  `restaurant_id` int NOT NULL,
  `business_day` varchar(10) NOT NULL,
  `last_number` int unsigned NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurant_id`, `business_day`)
);
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`;
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;
--> statement-breakpoint
ALTER TABLE `order_read_public_order_status` ADD COLUMN `businessDay` varchar(10) NULL AFTER `orderNumber`;
--> statement-breakpoint
ALTER TABLE `order_read_public_order_status` ADD COLUMN `daily_display_number` int unsigned NULL AFTER `businessDay`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_restaurant_business_day_display`
  ON `orders` (`restaurantId`, `businessDay`, `daily_display_number`);
