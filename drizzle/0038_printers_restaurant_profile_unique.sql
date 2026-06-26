-- THERMAL-PRINTING-13I.4D.A — unique printer profile identity per restaurant
--
-- Pre-flight: scripts/preflight-printing-integrity-audit.ts (duplicate_profiles)
-- Rollback: DROP INDEX `printers_restaurant_id_profile_id_unique` ON `printers`;

CREATE UNIQUE INDEX `printers_restaurant_id_profile_id_unique` ON `printers` (`restaurantId`, `profileId`);
