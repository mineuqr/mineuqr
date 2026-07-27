-- REPORTING-SALES-CHANNEL-ANALYTICS-1
-- Persist OrderingChannelId stamp for Sales Channel Analytics projection.
-- MIGRATION-GOVERNANCE-0083-ADOPTION-1 — AFTER clause corrected to match production
-- column name from 0066 (`identityScope`), not snake_case `identity_scope`.
-- TiDB: one statement per breakpoint (errno 8130 / multi-statement disabled).
ALTER TABLE `orders`
  ADD COLUMN `ordering_channel` varchar(32) NULL AFTER `identityScope`;
--> statement-breakpoint
ALTER TABLE `order_read_orders`
  ADD COLUMN `ordering_channel` varchar(32) NULL AFTER `identityScope`;
