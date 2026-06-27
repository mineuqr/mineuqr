-- RESET-1 Wave 5B — retire printing database architecture
-- Dependency-first: foreign keys → child tables → parent tables → cross-domain column

ALTER TABLE `print_job_telemetry_events` DROP FOREIGN KEY `print_job_telemetry_events_print_job_id_fk`;--> statement-breakpoint
ALTER TABLE `print_job_attempts` DROP FOREIGN KEY `print_job_attempts_print_job_id_fk`;--> statement-breakpoint
ALTER TABLE `print_jobs` DROP FOREIGN KEY `print_jobs_order_id_fk`;--> statement-breakpoint
ALTER TABLE `print_jobs` DROP FOREIGN KEY `print_jobs_printer_id_fk`;--> statement-breakpoint
DROP TABLE IF EXISTS `print_job_telemetry_events`;--> statement-breakpoint
DROP TABLE IF EXISTS `print_job_attempts`;--> statement-breakpoint
DROP TABLE IF EXISTS `print_jobs`;--> statement-breakpoint
DROP TABLE IF EXISTS `print_diagnostic_runs`;--> statement-breakpoint
DROP TABLE IF EXISTS `print_stations`;--> statement-breakpoint
DROP TABLE IF EXISTS `restaurant_print_settings`;--> statement-breakpoint
DROP TABLE IF EXISTS `printers`;--> statement-breakpoint
ALTER TABLE `categories` DROP COLUMN `stationId`;
