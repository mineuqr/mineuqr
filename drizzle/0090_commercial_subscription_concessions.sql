-- COMMERCIAL-ADMIN-FREE-PERIOD-IMPLEMENTATION-1
-- Additive commercial concession table.
-- Does NOT backfill existing subscriptions.
-- Does NOT write Charged Terms.
-- Does NOT modify catalog prices or user_subscriptions.
-- Do not apply to Production until a separate apply program is authorized.

CREATE TABLE `commercial_subscription_concessions` (
	`id` varchar(36) NOT NULL,
	`subscriptionId` int NOT NULL,
	`planId` varchar(36) NOT NULL,
	`billingCycleCode` varchar(64) NOT NULL,
	`unit` varchar(16) NOT NULL,
	`duration` int NOT NULL,
	`startsAt` timestamp NOT NULL,
	`endsAt` timestamp NOT NULL,
	`status` varchar(16) NOT NULL,
	`version` int NOT NULL,
	`source` varchar(32) NOT NULL,
	`actorId` int,
	`reason` varchar(512) NOT NULL,
	`supersededBy` varchar(36),
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `commercial_subscription_concessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `commercial_concessions_sub_version_uq` UNIQUE(`subscriptionId`,`version`)
);
--> statement-breakpoint
CREATE INDEX `commercial_concessions_sub_status_ends_idx`
	ON `commercial_subscription_concessions` (`subscriptionId`,`status`,`endsAt`);
