-- THERMAL-PRINTING-13I.4D.D.2 — print_job_telemetry_events.printJobId → print_jobs.id
--
-- Pre-flight: scripts/preflight-printing-integrity-audit.ts (orphan_telemetry)
-- Deletion policy: RESTRICT — preserves operational telemetry; parent job cannot be deleted while events exist.
-- Rollback: ALTER TABLE `print_job_telemetry_events` DROP FOREIGN KEY `print_job_telemetry_events_print_job_id_fk`;

ALTER TABLE `print_job_telemetry_events`
  ADD CONSTRAINT `print_job_telemetry_events_print_job_id_fk`
  FOREIGN KEY (`printJobId`) REFERENCES `print_jobs` (`id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
