-- KIOSK-PRESENTATION-ADOPTION-1: Business Identity scoped by Business Day + Identity Scope (TABLE | KIOSK).

ALTER TABLE `orders` ADD COLUMN `identityScope` varchar(16) NULL AFTER `daily_display_number`;
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `identityScope` varchar(16) NULL AFTER `daily_display_number`;
--> statement-breakpoint
ALTER TABLE `order_read_public_order_status` ADD COLUMN `identityScope` varchar(16) NULL AFTER `daily_display_number`;
--> statement-breakpoint
UPDATE `orders` SET `identityScope` = 'TABLE' WHERE `businessDay` IS NOT NULL AND (`identityScope` IS NULL OR `identityScope` = '');
--> statement-breakpoint
UPDATE `order_read_orders` SET `identityScope` = 'TABLE' WHERE `businessDay` IS NOT NULL AND (`identityScope` IS NULL OR `identityScope` = '');
--> statement-breakpoint
UPDATE `order_read_public_order_status` SET `identityScope` = 'TABLE' WHERE `businessDay` IS NOT NULL AND (`identityScope` IS NULL OR `identityScope` = '');
--> statement-breakpoint
CREATE TABLE `order_business_day_sequences_v2` (
  `restaurant_id` int NOT NULL,
  `business_day` varchar(10) NOT NULL,
  `identity_scope` varchar(16) NOT NULL,
  `last_number` int unsigned NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurant_id`, `business_day`, `identity_scope`)
);
--> statement-breakpoint
INSERT INTO `order_business_day_sequences_v2` (`restaurant_id`, `business_day`, `identity_scope`, `last_number`, `updated_at`)
SELECT `restaurant_id`, `business_day`, 'TABLE', `last_number`, `updated_at` FROM `order_business_day_sequences`;
--> statement-breakpoint
DROP TABLE `order_business_day_sequences`;
--> statement-breakpoint
RENAME TABLE `order_business_day_sequences_v2` TO `order_business_day_sequences`;
--> statement-breakpoint
DROP INDEX `uq_orders_restaurant_business_day_display` ON `orders`;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_orders_restaurant_business_day_scope_display`
  ON `orders` (`restaurantId`, `businessDay`, `identityScope`, `daily_display_number`);
