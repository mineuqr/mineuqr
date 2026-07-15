-- ORDER-READ-MODIFIERS-PERSISTENCE-1
-- Persist Order Item modifiers on write model + Order Read line projection.
ALTER TABLE `order_items` ADD COLUMN `modifiers` json NULL;
--> statement-breakpoint
ALTER TABLE `order_read_order_line_items` ADD COLUMN `modifiers` json NULL;
