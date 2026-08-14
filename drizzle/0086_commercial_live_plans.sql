-- COMMERCIAL-LIVE-PLANS-CLEAN-RESET-1
-- Replace unapplied conversion 0086 with a clean Live Plan schema + catalog wipe.
-- Does NOT copy retired/admin-experiment rows. Does NOT touch users, subscriptions,
-- invoices, payments, subscription_plans, restaurants, orders, or settlement.
-- Bindings table is kept (currently empty). Version/snapshot/publication/retirement tables dropped.
-- Live plan rows are created by idempotent application bootstrap, not this SQL.

-- 1. Live Plan composition on commercial_plans
ALTER TABLE `commercial_plans`
	ADD COLUMN `featureBundleId` varchar(36),
	ADD COLUMN `limitProfileId` varchar(36),
	ADD COLUMN `trialPolicyId` varchar(36);
--> statement-breakpoint

-- 2. Wipe obsolete catalog aggregates (no conversion)
DELETE FROM `commercial_bundle_features`;
--> statement-breakpoint
DELETE FROM `commercial_limit_values`;
--> statement-breakpoint
DELETE FROM `commercial_prices`;
--> statement-breakpoint
DELETE FROM `commercial_promotions`;
--> statement-breakpoint
DELETE FROM `commercial_plans`;
--> statement-breakpoint
DELETE FROM `commercial_feature_bundles`;
--> statement-breakpoint
DELETE FROM `commercial_limit_profiles`;
--> statement-breakpoint
DELETE FROM `commercial_trial_policies`;
--> statement-breakpoint
DELETE FROM `commercial_migration_policies`;
--> statement-breakpoint
DELETE FROM `commercial_regions`;
--> statement-breakpoint
DELETE FROM `commercial_billing_cycles`;
--> statement-breakpoint

-- 3. Prices keyed by live planId (table empty after wipe)
ALTER TABLE `commercial_prices`
	ADD COLUMN `planId` varchar(36);
--> statement-breakpoint
ALTER TABLE `commercial_prices` DROP INDEX `commercial_prices_version_idx`;
--> statement-breakpoint
ALTER TABLE `commercial_prices` DROP COLUMN `planVersionId`;
--> statement-breakpoint
ALTER TABLE `commercial_prices` MODIFY `planId` varchar(36) NOT NULL;
--> statement-breakpoint
CREATE INDEX `commercial_prices_plan_idx` ON `commercial_prices` (`planId`);
--> statement-breakpoint

-- 4. Promotions eligible by live plan ids (table empty)
ALTER TABLE `commercial_promotions` CHANGE `eligiblePlanVersionIds` `eligiblePlanIds` json NOT NULL;
--> statement-breakpoint

-- 5. Bindings: keep table, switch to live plan + charged terms (0 rows)
ALTER TABLE `commercial_subscription_bindings`
	ADD COLUMN `planId` varchar(36),
	ADD COLUMN `chargedAmount` decimal(12,2),
	ADD COLUMN `chargedCurrency` varchar(8),
	ADD COLUMN `billingCycleId` varchar(36),
	ADD COLUMN `billingCycleCode` varchar(64),
	ADD COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;
--> statement-breakpoint
ALTER TABLE `commercial_subscription_bindings` DROP INDEX `commercial_subscription_bindings_version_idx`;
--> statement-breakpoint
ALTER TABLE `commercial_subscription_bindings` DROP INDEX `commercial_subscription_bindings_snapshot_idx`;
--> statement-breakpoint
ALTER TABLE `commercial_subscription_bindings` DROP COLUMN `planVersionId`;
--> statement-breakpoint
ALTER TABLE `commercial_subscription_bindings` DROP COLUMN `snapshotId`;
--> statement-breakpoint
ALTER TABLE `commercial_subscription_bindings` MODIFY `planId` varchar(36) NOT NULL;
--> statement-breakpoint
CREATE INDEX `commercial_subscription_bindings_plan_idx` ON `commercial_subscription_bindings` (`planId`);
--> statement-breakpoint

-- 6. Drop obsolete versioned-catalog structures (forensically unused)
DROP TABLE `commercial_snapshot_definitions`;
--> statement-breakpoint
DROP TABLE `commercial_publication_rules`;
--> statement-breakpoint
DROP TABLE `commercial_plan_versions`;
--> statement-breakpoint
DROP TABLE `commercial_retirement_policies`;
