-- SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1
-- Saudi Compliance Tax Invoice aggregate (internal domain foundation).
-- Not ZATCA. Not Fatoora. Not IRN. Not QR. Not VAT engine.
-- Idempotency: UNIQUE (restaurantId, collectionFactId, documentKind).
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `saudi_tax_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `taxInvoiceId` varchar(128) NOT NULL,
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `collectionFactId` varchar(128) NOT NULL,
  `documentKind` enum('tax_invoice') NOT NULL DEFAULT 'tax_invoice',
  `status` enum('blocked_profile','generated','failed','retryable') NOT NULL,
  `partyModel` enum('b2c','b2b','b2g','unclassified') NOT NULL,
  `invoiceForm` enum('simplified_tax_invoice','standard_tax_invoice','undetermined') NOT NULL,
  `classificationRationaleCode` varchar(128) NOT NULL,
  `classificationJson` json NOT NULL,
  `sellerSnapshotJson` json NOT NULL,
  `buyerSnapshotJson` json NOT NULL,
  `linesSnapshotJson` json NOT NULL,
  `monetarySnapshotJson` json NOT NULL,
  `paymentSnapshotJson` json NOT NULL,
  `sourceCustomerId` int DEFAULT NULL,
  `profileReadinessAtIssuance` varchar(32) DEFAULT NULL,
  `failureCode` varchar(64) DEFAULT NULL,
  `failureMessage` text,
  `attemptCount` int NOT NULL DEFAULT 1,
  `issuedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saudi_tax_invoices_tax_invoice_id_unique` (`taxInvoiceId`),
  UNIQUE KEY `saudi_tax_invoices_idempotency_unique` (`restaurantId`, `collectionFactId`, `documentKind`),
  KEY `saudi_tax_invoices_restaurant_id` (`restaurantId`),
  KEY `saudi_tax_invoices_restaurant_order` (`restaurantId`, `orderId`),
  KEY `saudi_tax_invoices_restaurant_status` (`restaurantId`, `status`),
  KEY `saudi_tax_invoices_source_customer` (`restaurantId`, `sourceCustomerId`),
  CONSTRAINT `saudi_tax_invoices_source_customer_fk`
    FOREIGN KEY (`sourceCustomerId`) REFERENCES `customers` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT
);
