-- THERMAL-PRINTING-13I.4D.C — print_jobs.orderId → orders.id
--
-- Pre-flight: scripts/preflight-printing-integrity-audit.ts (orphan_order_refs)
-- Restaurant alignment remains runtime-only (tenantOwnershipAuthority).
-- Rollback: ALTER TABLE `print_jobs` DROP FOREIGN KEY `print_jobs_order_id_fk`;

ALTER TABLE `print_jobs`
  ADD CONSTRAINT `print_jobs_order_id_fk`
  FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`)
  ON DELETE RESTRICT ON UPDATE RESTRICT;
