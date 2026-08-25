-- CASHIER-REBUILD-1 Stage 1
-- Persist the OPEN Check identity created in the same Order transaction as pos.sale.create.
-- Replay returns the same orderId and checkId. Not a payment path.

ALTER TABLE `pos_sale_idempotency`
	ADD COLUMN `checkId` int NOT NULL,
	ADD COLUMN `subtotal` varchar(16) NOT NULL,
	ADD COLUMN `taxAmount` varchar(16) NOT NULL,
	ADD COLUMN `grandTotal` varchar(16) NOT NULL,
	ADD COLUMN `billDiscountAmount` varchar(16) NOT NULL,
	ADD COLUMN `linesJson` json NOT NULL;
