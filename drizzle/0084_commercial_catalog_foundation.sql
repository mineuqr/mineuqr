-- COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
-- Normalized Commercial Catalog aggregates. No subscription tables.

CREATE TABLE `commercial_plans` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isHidden` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_plans_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_billing_cycles` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`intervalCount` int NOT NULL,
	`intervalUnit` enum('day','week','month','year') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_billing_cycles_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_billing_cycles_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_feature_bundles` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_feature_bundles_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_feature_bundles_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_bundle_features` (
	`id` varchar(36) NOT NULL,
	`bundleId` varchar(36) NOT NULL,
	`featureKey` varchar(128) NOT NULL,
	`included` boolean NOT NULL DEFAULT true,
	CONSTRAINT `commercial_bundle_features_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_bundle_features_uq` UNIQUE(`bundleId`,`featureKey`)
);
--> statement-breakpoint
CREATE INDEX `commercial_bundle_features_bundle_idx` ON `commercial_bundle_features` (`bundleId`);
--> statement-breakpoint
CREATE TABLE `commercial_limit_profiles` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_limit_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_limit_profiles_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_limit_values` (
	`id` varchar(36) NOT NULL,
	`profileId` varchar(36) NOT NULL,
	`limitKey` varchar(128) NOT NULL,
	`value` int,
	`unit` varchar(64),
	CONSTRAINT `commercial_limit_values_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_limit_values_uq` UNIQUE(`profileId`,`limitKey`)
);
--> statement-breakpoint
CREATE INDEX `commercial_limit_values_profile_idx` ON `commercial_limit_values` (`profileId`);
--> statement-breakpoint
CREATE TABLE `commercial_trial_policies` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`durationDays` int NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_trial_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_trial_policies_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_migration_policies` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`requiresExplicitAction` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_migration_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_migration_policies_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_retirement_policies` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`allowRenewals` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_retirement_policies_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_retirement_policies_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_regions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`countryCode` varchar(8) NOT NULL,
	`currency` varchar(8) NOT NULL,
	`taxPolicyRef` varchar(128),
	`distributionPartner` varchar(255),
	`regulatoryNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_regions_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_regions_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_plan_versions` (
	`id` varchar(36) NOT NULL,
	`planId` varchar(36) NOT NULL,
	`versionCode` varchar(64) NOT NULL,
	`versionName` varchar(255) NOT NULL,
	`state` enum('draft','published','deprecated','retired') NOT NULL DEFAULT 'draft',
	`featureBundleId` varchar(36),
	`limitProfileId` varchar(36),
	`trialPolicyId` varchar(36),
	`migrationPolicyId` varchar(36),
	`retirementPolicyId` varchar(36),
	`compatibility` json NOT NULL,
	`publishedAt` timestamp,
	`deprecatedAt` timestamp,
	`retiredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_plan_versions_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_plan_versions_plan_code_uq` UNIQUE(`planId`,`versionCode`)
);
--> statement-breakpoint
CREATE INDEX `commercial_plan_versions_plan_idx` ON `commercial_plan_versions` (`planId`);
--> statement-breakpoint
CREATE TABLE `commercial_prices` (
	`id` varchar(36) NOT NULL,
	`planVersionId` varchar(36) NOT NULL,
	`billingCycleId` varchar(36) NOT NULL,
	`currency` varchar(8) NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`regionId` varchar(36),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `commercial_prices_version_idx` ON `commercial_prices` (`planVersionId`);
--> statement-breakpoint
CREATE INDEX `commercial_prices_region_idx` ON `commercial_prices` (`regionId`);
--> statement-breakpoint
CREATE TABLE `commercial_promotions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`effectSummary` text NOT NULL,
	`eligiblePlanVersionIds` json NOT NULL,
	`startsAt` timestamp,
	`endsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_promotions_code_uq` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `commercial_snapshot_definitions` (
	`id` varchar(36) NOT NULL,
	`planVersionId` varchar(36) NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 1,
	`payload` json NOT NULL,
	`effectiveDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercial_snapshot_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `commercial_snapshot_definitions_version_idx` ON `commercial_snapshot_definitions` (`planVersionId`);
--> statement-breakpoint
CREATE TABLE `commercial_publication_rules` (
	`id` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`mandatoryChecks` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_publication_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_publication_rules_code_uq` UNIQUE(`code`)
);
