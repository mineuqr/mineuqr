-- COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1
-- Catalog-owned subscription ↔ snapshot bindings. Additive only.

CREATE TABLE `commercial_subscription_bindings` (
	`id` varchar(36) NOT NULL,
	`subscriptionId` int NOT NULL,
	`planVersionId` varchar(36) NOT NULL,
	`snapshotId` varchar(36) NOT NULL,
	`legacyPlanId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercial_subscription_bindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_subscription_bindings_sub_uq` UNIQUE(`subscriptionId`)
);
--> statement-breakpoint
CREATE INDEX `commercial_subscription_bindings_version_idx` ON `commercial_subscription_bindings` (`planVersionId`);
--> statement-breakpoint
CREATE INDEX `commercial_subscription_bindings_snapshot_idx` ON `commercial_subscription_bindings` (`snapshotId`);
