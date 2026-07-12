-- SCREEN-CREDENTIAL-LIFECYCLE-1 — operator-retrievable permanent screen credentials.
-- MIGRATION-COMPATIBILITY-0063-1: align identifiers with certified camelCase (0054+ operational_device_tokens).
ALTER TABLE `operational_device_tokens`
  ADD COLUMN `secretCiphertext` varchar(512) NULL AFTER `secretHash`;
