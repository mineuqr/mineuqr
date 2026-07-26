-- REFUND-DOCUMENT-NUMBERING-ADOPTION-1
-- Independent RF- operational identity for Refund Settlement Records.
-- Identity plane only — no money / Reporting / Register changes.
-- TiDB: one statement per breakpoint.

CREATE TABLE IF NOT EXISTS `refund_document_sequences` (
  `restaurantId` int NOT NULL,
  `lastNumber` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`restaurantId`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `refund_document_numbers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurantId` int NOT NULL,
  `settlementRecordId` varchar(128) NOT NULL,
  `sequenceNumber` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refund_document_numbers_record_unique` (`settlementRecordId`),
  UNIQUE KEY `refund_document_numbers_restaurant_sequence_unique` (`restaurantId`, `sequenceNumber`),
  KEY `refund_document_numbers_restaurant_id` (`restaurantId`)
);
--> statement-breakpoint
-- Backfill historical refund Settlement Records (stable order by id).
INSERT INTO `refund_document_numbers` (
  `restaurantId`,
  `settlementRecordId`,
  `sequenceNumber`,
  `createdAt`
)
SELECT
  ranked.`restaurantId`,
  ranked.`settlementRecordId`,
  ranked.`n`,
  ranked.`createdAt`
FROM (
  SELECT
    `restaurantId`,
    `settlementRecordId`,
    `createdAt`,
    ROW_NUMBER() OVER (
      PARTITION BY `restaurantId`
      ORDER BY `id`
    ) AS `n`
  FROM `settlement_records`
  WHERE `recordKind` = 'refund'
) AS ranked
ON DUPLICATE KEY UPDATE `sequenceNumber` = `sequenceNumber`;
--> statement-breakpoint
INSERT INTO `refund_document_sequences` (`restaurantId`, `lastNumber`)
SELECT `restaurantId`, MAX(`sequenceNumber`)
FROM `refund_document_numbers`
GROUP BY `restaurantId`
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(
  `refund_document_sequences`.`lastNumber`,
  VALUES(`lastNumber`)
);
