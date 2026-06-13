CREATE TABLE `customer_push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`trackingToken` varchar(64) NOT NULL,
	`endpoint` varchar(512) NOT NULL,
	`endpointHash` char(64) NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	`expiresAt` timestamp NULL,
	`lastUsedAt` timestamp NULL,
	CONSTRAINT `customer_push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_push_endpoint_hash_order` UNIQUE(`orderId`,`endpointHash`)
);
--> statement-breakpoint
CREATE INDEX `idx_push_tracking_token` ON `customer_push_subscriptions` (`trackingToken`);
--> statement-breakpoint
CREATE INDEX `idx_push_expires_at` ON `customer_push_subscriptions` (`expiresAt`);
