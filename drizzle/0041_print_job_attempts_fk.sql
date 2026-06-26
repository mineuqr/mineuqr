-- THERMAL-PRINTING-13I.4D.D.1 — print_job_attempts.printJobId → print_jobs.id
--
-- Pre-flight: scripts/preflight-printing-integrity-audit.ts (orphan_attempts)
-- Deletion policy: RESTRICT — preserves audit trail; parent job cannot be deleted while attempts exist.
-- Rollback: ALTER TABLE `print_job_attempts` DROP FOREIGN KEY `print_job_attempts_print_job_id_fk`;

ALTER TABLE `print_job_attempts`
  ADD CONSTRAINT `print_job_attempts_print_job_id_fk`
  FOREIGN KEY (`printJobId`) REFERENCES `print_jobs` (`id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
