-- ADMIN-AUTH-1B — account classification column + idempotent backfill
ALTER TABLE `users` ADD `accountClassification` enum('COMMERCIAL','INTERNAL','SYSTEM') NOT NULL DEFAULT 'COMMERCIAL';
--> statement-breakpoint
UPDATE `users` SET `accountClassification` = 'INTERNAL' WHERE `role` = 'admin' AND `accountClassification` = 'COMMERCIAL';
