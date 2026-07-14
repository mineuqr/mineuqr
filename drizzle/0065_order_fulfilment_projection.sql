-- OPERATIONAL-FULFILMENT-PROJECTION-1: project Service Mode / Fulfilment Anchor / Label
-- Additive nullable stamps on write + read model. Historical rows backfilled via resolveFulfilmentProjection.

ALTER TABLE `orders` ADD COLUMN `serviceMode` varchar(32) NULL AFTER `sessionId`;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `fulfilmentAnchorType` varchar(32) NULL AFTER `serviceMode`;
--> statement-breakpoint
ALTER TABLE `orders` ADD COLUMN `fulfilmentLabel` varchar(128) NULL AFTER `fulfilmentAnchorType`;
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `serviceMode` varchar(32) NULL AFTER `sessionId`;
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `fulfilmentAnchorType` varchar(32) NULL AFTER `serviceMode`;
--> statement-breakpoint
ALTER TABLE `order_read_orders` ADD COLUMN `fulfilmentLabel` varchar(128) NULL AFTER `fulfilmentAnchorType`;
