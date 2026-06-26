-- THERMAL-PRINTING-13I.3C.1 — authoritative execution state (assigned + agent columns)
ALTER TABLE `print_jobs`
  MODIFY COLUMN `status` enum(
    'queued',
    'assigned',
    'claimed',
    'printing',
    'printed',
    'failed',
    'cancelled',
    'expired'
  ) NOT NULL DEFAULT 'queued';

ALTER TABLE `print_jobs`
  ADD COLUMN `assignedAgentId` varchar(128) NULL AFTER `stationId`,
  ADD COLUMN `assignedAt` timestamp NULL AFTER `assignedAgentId`;
