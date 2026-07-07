-- DEVICE-PROVISIONING-UX-2 — short activation codes for URL + code onboarding
ALTER TABLE `operational_device_tokens`
  ADD COLUMN `activationCodeHash` varchar(64) NULL,
  ADD COLUMN `activationCodeExpiresAt` timestamp NULL;
--> statement-breakpoint
CREATE INDEX `operational_device_tokens_activation_code_hash` ON `operational_device_tokens` (`activationCodeHash`);
