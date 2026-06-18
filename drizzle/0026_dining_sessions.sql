CREATE TABLE `dining_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`restaurantId` int NOT NULL,
	`tableId` int NOT NULL,
	`tableNumber` int NOT NULL,
	`sessionToken` varchar(64) NOT NULL,
	`status` enum('open','bill_requested','payment_pending','closed') NOT NULL DEFAULT 'open',
	`openGuard` tinyint,
	`openedAt` timestamp NOT NULL,
	`billRequestedAt` timestamp,
	`paymentPendingAt` timestamp,
	`closedAt` timestamp,
	`totalAmount` decimal(10,2),
	`totalOrders` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dining_sessions_session_token_unique` UNIQUE(`sessionToken`),
	CONSTRAINT `dining_sessions_restaurant_id_table_id_open_guard` UNIQUE(`restaurantId`,`tableId`,`openGuard`)
);
--> statement-breakpoint
CREATE INDEX `dining_sessions_restaurant_id` ON `dining_sessions` (`restaurantId`);--> statement-breakpoint
CREATE INDEX `dining_sessions_table_id` ON `dining_sessions` (`tableId`);--> statement-breakpoint
CREATE INDEX `dining_sessions_status` ON `dining_sessions` (`status`);--> statement-breakpoint
CREATE INDEX `dining_sessions_restaurant_id_table_id` ON `dining_sessions` (`restaurantId`,`tableId`);--> statement-breakpoint
CREATE INDEX `dining_sessions_restaurant_id_status_opened_at` ON `dining_sessions` (`restaurantId`,`status`,`openedAt`);
