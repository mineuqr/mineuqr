-- ORDERING-READ-ITEM-NOTES-PERSISTENCE-1
-- Permanently project Item Notes onto the Ordering Read Model line projection.
ALTER TABLE `order_read_order_line_items` ADD COLUMN `itemNotes` text NULL;
