ALTER TABLE `orders` ADD `trackingToken` varchar(64);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_tracking_token_unique` ON `orders` (`trackingToken`);
