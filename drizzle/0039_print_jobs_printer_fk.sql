-- THERMAL-PRINTING-13I.4D.B — print_jobs.printerId → printers.id
--
-- Pre-flight: scripts/preflight-printing-integrity-audit.ts (orphan_printer_refs)
-- Nullable printerId remains valid (NULL skips FK check).
-- Restaurant alignment remains runtime-only (tenantOwnershipAuthority).
-- Rollback: ALTER TABLE `print_jobs` DROP FOREIGN KEY `print_jobs_printer_id_fk`;

ALTER TABLE `print_jobs`
  ADD CONSTRAINT `print_jobs_printer_id_fk`
  FOREIGN KEY (`printerId`) REFERENCES `printers` (`id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
