-- SAUDI-TAX-INVOICE-PHASE-1
-- Phase 1 generation fields + restaurant-scoped Tax Invoice number sequence.
-- Not Fatoora. Not Phase 2. Not CSID/signing/hash chain.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `saudi_tax_invoice_sequences` (
  `restaurantId` int NOT NULL,
  `lastNumber` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`restaurantId`)
);
--> statement-breakpoint
ALTER TABLE `saudi_tax_invoices`
  ADD COLUMN `invoiceNumber` varchar(32) DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `saudi_tax_invoices`
  ADD COLUMN `invoiceSequence` int DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `saudi_tax_invoices`
  ADD COLUMN `issueTimestampIso` varchar(64) DEFAULT NULL;
--> statement-breakpoint
ALTER TABLE `saudi_tax_invoices`
  ADD COLUMN `qrPayloadBase64` text;
--> statement-breakpoint
ALTER TABLE `saudi_tax_invoices`
  ADD COLUMN `phase1DocumentJson` json;
--> statement-breakpoint
CREATE UNIQUE INDEX `saudi_tax_invoices_restaurant_sequence_unique`
  ON `saudi_tax_invoices` (`restaurantId`, `invoiceSequence`);
--> statement-breakpoint
CREATE UNIQUE INDEX `saudi_tax_invoices_restaurant_invoice_number_unique`
  ON `saudi_tax_invoices` (`restaurantId`, `invoiceNumber`);
