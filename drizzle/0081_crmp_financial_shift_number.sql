-- FINANCIAL-SHIFT-RETENTION-ADOPTION-1
-- Human-readable Shift Number (restaurant + register scoped sequence).
-- Soft-archive columns already exist (0078). No Settlement / Reporting changes.

CREATE TABLE IF NOT EXISTS `crmp_register_shift_sequences` (
  `restaurantId` int NOT NULL,
  `registerId` varchar(128) NOT NULL,
  `lastNumber` int NOT NULL DEFAULT 0,
  PRIMARY KEY (`restaurantId`, `registerId`)
);

ALTER TABLE `crmp_financial_shifts`
  ADD COLUMN `shiftNumber` int NULL AFTER `financialShiftId`;

-- MySQL 8 window function backfill (stable, immutable once assigned).
UPDATE `crmp_financial_shifts` AS s
INNER JOIN (
  SELECT
    `id`,
    ROW_NUMBER() OVER (
      PARTITION BY `restaurantId`, `registerId`
      ORDER BY `id`
    ) AS `n`
  FROM `crmp_financial_shifts`
) AS ranked ON ranked.`id` = s.`id`
SET s.`shiftNumber` = ranked.`n`;

INSERT INTO `crmp_register_shift_sequences` (`restaurantId`, `registerId`, `lastNumber`)
SELECT `restaurantId`, `registerId`, MAX(`shiftNumber`)
FROM `crmp_financial_shifts`
WHERE `shiftNumber` IS NOT NULL
GROUP BY `restaurantId`, `registerId`
ON DUPLICATE KEY UPDATE `lastNumber` = GREATEST(`crmp_register_shift_sequences`.`lastNumber`, VALUES(`lastNumber`));

ALTER TABLE `crmp_financial_shifts`
  MODIFY COLUMN `shiftNumber` int NOT NULL;

CREATE UNIQUE INDEX `crmp_financial_shifts_register_shift_number_unique`
  ON `crmp_financial_shifts` (`restaurantId`, `registerId`, `shiftNumber`);

CREATE INDEX `crmp_financial_shifts_restaurant_closed`
  ON `crmp_financial_shifts` (`restaurantId`, `closedAt`);

CREATE INDEX `crmp_financial_shifts_restaurant_status_closed`
  ON `crmp_financial_shifts` (`restaurantId`, `status`, `closedAt`);
