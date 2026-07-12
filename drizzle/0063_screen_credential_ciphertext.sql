-- SCREEN-CREDENTIAL-LIFECYCLE-1 — operator-retrievable permanent screen credentials.
ALTER TABLE `operational_device_tokens`
  ADD COLUMN `secret_ciphertext` varchar(512) NULL AFTER `secret_hash`;
