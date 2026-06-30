-- PRINT-PRINTER-CATALOG-1 — one-time legacy selection → catalog migration (ADR-ARCH-017 M-1)
-- Copies rows only when the restaurant has no active catalog printer and the printer was not soft-deleted.
INSERT INTO `restaurant_printers` (
  `restaurantId`,
  `printerId`,
  `displayName`,
  `platform`,
  `transport`,
  `isDefault`,
  `isActive`
)
SELECT
  pcs.`restaurantId`,
  pcs.`printerId`,
  pcs.`printerName`,
  pcs.`platform`,
  pcs.`transport`,
  1,
  1
FROM `print_connector_selections` pcs
WHERE NOT EXISTS (
  SELECT 1
  FROM `restaurant_printers` rp
  WHERE rp.`restaurantId` = pcs.`restaurantId`
    AND rp.`isActive` = 1
)
AND NOT EXISTS (
  SELECT 1
  FROM `restaurant_printers` rp
  WHERE rp.`restaurantId` = pcs.`restaurantId`
    AND rp.`printerId` = pcs.`printerId`
    AND rp.`isActive` = 0
);
