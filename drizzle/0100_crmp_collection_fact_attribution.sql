-- CRMP-CF-ATTRIBUTION-1
-- Additive CRMP attribution identity: Collection Fact for current Cashier sales.
-- settlementRecordId becomes nullable for CF-backed current sales.
-- Historical SR-only rows and refund attributions keep settlementRecordId.
-- Does not create a financial ledger. Does not alter Check, Collection Fact, or refund persistence.
-- Does not INSERT/UPDATE/DELETE financial rows. Existing attribution rows unchanged.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

ALTER TABLE `crmp_settlement_attributions` MODIFY COLUMN `settlementRecordId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `crmp_settlement_attributions` ADD COLUMN `collectionFactId` varchar(128) NULL;
--> statement-breakpoint
ALTER TABLE `crmp_settlement_attributions` ADD COLUMN `source` enum('collection_fact','legacy_settlement_record') NOT NULL DEFAULT 'legacy_settlement_record';
--> statement-breakpoint
CREATE UNIQUE INDEX `crmp_settlement_attributions_cf_unique` ON `crmp_settlement_attributions` (`collectionFactId`);
