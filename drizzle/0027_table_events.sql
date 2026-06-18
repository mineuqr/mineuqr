CREATE TABLE `table_events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`tableId` int NOT NULL,
	`sessionId` int,
	`orderId` int,
	`eventType` varchar(32) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `table_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `table_events_session_id_created_at` ON `table_events` (`sessionId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `table_events_restaurant_id_created_at` ON `table_events` (`restaurantId`,`createdAt`);