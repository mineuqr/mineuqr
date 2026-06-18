ALTER TABLE `orders` ADD `sessionId` int;--> statement-breakpoint
CREATE INDEX `orders_session_id` ON `orders` (`sessionId`);