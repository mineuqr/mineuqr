-- THERMAL-PRINTING-3B.2 — enforce UNIQUE(idempotencyKey) on print_jobs
--
-- Pre-flight (run manually before applying if table has data):
--   SELECT idempotencyKey, COUNT(*) AS cnt
--   FROM print_jobs
--   GROUP BY idempotencyKey
--   HAVING cnt > 1;
DROP INDEX `print_jobs_idempotency_key` ON `print_jobs`;--> statement-breakpoint
CREATE UNIQUE INDEX `print_jobs_idempotency_key_unique` ON `print_jobs` (`idempotencyKey`);
