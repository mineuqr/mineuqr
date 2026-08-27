-- CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1
-- Independent Cashier invoice identity. Not Order identity. Not a financial ledger.
-- Restaurant-scoped sequence does not reset on business day.
-- Does not alter orders, Collection Fact, Check, or POS business-day sequences.
-- No backfill. Historical sales keep operational displayReference as receipt fallback.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `cashier_invoice_sequences` (
  `restaurantId` int NOT NULL,
  `lastNumber` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`restaurantId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cashier_invoices` (
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `sequenceNumber` int NOT NULL,
  `allocatedAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`restaurantId`, `orderId`),
  UNIQUE KEY `cashier_invoices_restaurant_sequence_unique` (`restaurantId`, `sequenceNumber`)
);
