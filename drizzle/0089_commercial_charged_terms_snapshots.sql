-- COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1
-- Additive empty Charged Terms snapshot table.
-- Does NOT copy leftover Binding charged fields.
-- Does NOT infer historical price from catalog or the legacy plan table.
-- Snapshots are created only by commercial commitment flows.
-- Does NOT drop leftover Binding charged columns.
-- Do not apply to Production until a separate apply program is authorized.

CREATE TABLE `commercial_subscription_charged_terms` (
	`id` varchar(36) NOT NULL,
	`subscriptionId` int NOT NULL,
	`planId` varchar(36) NOT NULL,
	`chargedAmount` decimal(12,2) NOT NULL,
	`chargedCurrency` varchar(8) NOT NULL,
	`billingCycleId` varchar(36),
	`billingCycleCode` varchar(64) NOT NULL,
	`effectiveFrom` timestamp NOT NULL,
	`version` int NOT NULL,
	`source` varchar(32) NOT NULL,
	`actorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercial_subscription_charged_terms_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_charged_terms_sub_version_uq` UNIQUE(`subscriptionId`,`version`)
);
--> statement-breakpoint
CREATE INDEX `commercial_charged_terms_sub_effective_idx`
	ON `commercial_subscription_charged_terms` (`subscriptionId`,`effectiveFrom`);
