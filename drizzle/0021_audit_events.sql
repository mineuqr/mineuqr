CREATE TABLE `audit_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`eventVersion` int NOT NULL DEFAULT 1,
	`category` enum('ACCESS','USER','SUBSCRIPTION','COMMERCIAL','SECURITY') NOT NULL,
	`severity` enum('info','warn','error') NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`actorId` int,
	`actorRole` varchar(16),
	`targetType` varchar(32),
	`targetId` int,
	`procedure` varchar(128),
	`correlationId` varchar(64),
	`ip` varchar(45),
	`before` json,
	`after` json,
	`metadata` json,
	CONSTRAINT `audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `audit_events_occurred_at_idx` ON `audit_events` (`occurredAt`);
--> statement-breakpoint
CREATE INDEX `audit_events_event_type_occurred_at_idx` ON `audit_events` (`eventType`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `audit_events_actor_id_occurred_at_idx` ON `audit_events` (`actorId`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `audit_events_target_occurred_at_idx` ON `audit_events` (`targetType`,`targetId`,`occurredAt`);
--> statement-breakpoint
CREATE INDEX `audit_events_category_occurred_at_idx` ON `audit_events` (`category`,`occurredAt`);
