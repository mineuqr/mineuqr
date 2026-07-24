-- SHIFT-LIFECYCLE-IMPLEMENTATION-1 / ADR-ARCH-030
-- Additive expansion of Financial Shift statuses + close/archive metadata.
-- No Check / Settlement / Settlement Record / Reporting changes.
-- Production deployment NOT authorized by the implementation program alone.
-- TiDB: one statement per breakpoint.

ALTER TABLE `crmp_financial_shifts`
	MODIFY COLUMN `status` enum('open','suspended','closing','handover_pending','closed','archived') NOT NULL;
--> statement-breakpoint
ALTER TABLE `crmp_financial_shifts`
	ADD COLUMN `closeReason` enum('normal','handover','cancelled_empty','recovery') NULL;
--> statement-breakpoint
ALTER TABLE `crmp_financial_shifts`
	ADD COLUMN `archivedAt` timestamp NULL;
