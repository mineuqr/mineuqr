-- THERMAL-PRINTING-13I.3C.2 — durable dispatch notification state
ALTER TABLE `print_jobs`
  ADD COLUMN `dispatchNotifiedAt` timestamp NULL AFTER `assignedAt`;

CREATE INDEX `print_jobs_dispatch_pending` ON `print_jobs` (`assignedAgentId`, `dispatchNotifiedAt`);
