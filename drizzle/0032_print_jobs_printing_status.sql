-- THERMAL-PRINTING-3C.2 — add printing execution status to print_jobs
ALTER TABLE `print_jobs` MODIFY COLUMN `status` enum('queued','claimed','printing','printed','failed','cancelled','expired') NOT NULL DEFAULT 'queued';
