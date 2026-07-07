ALTER TABLE `order_read_order_line_items` ADD COLUMN `lineProjectionType` varchar(16) NOT NULL DEFAULT 'MenuItem';
--> statement-breakpoint
ALTER TABLE `order_read_order_line_items` ADD COLUMN `offerProjection` JSON NULL;
--> statement-breakpoint
ALTER TABLE `order_read_order_line_items` MODIFY COLUMN `categoryProjection` JSON NULL;
