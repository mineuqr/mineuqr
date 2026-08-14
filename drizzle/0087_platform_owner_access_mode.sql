-- PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
-- Additive owner access-mode table only.
-- Does NOT touch users, restaurants, user_subscriptions, subscription_plans,
-- invoices, payments, commercial catalog, or bindings.

CREATE TABLE `platform_owner_access_mode` (
	`ownerOpenId` varchar(64) NOT NULL,
	`mode` enum('FULL_PLATFORM','SIMULATED_PLAN') NOT NULL,
	`simulatedPlanCode` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_owner_access_mode_pk` PRIMARY KEY(`ownerOpenId`),
	CONSTRAINT `platform_owner_access_mode_state_chk` CHECK(
		(`mode` = 'FULL_PLATFORM' AND `simulatedPlanCode` IS NULL)
		OR (`mode` = 'SIMULATED_PLAN' AND `simulatedPlanCode` IS NOT NULL)
	)
);
--> statement-breakpoint
