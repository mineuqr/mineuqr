-- PRINTING-1 — operational print job persistence (not legacy print infrastructure)
CREATE TABLE `print_jobs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `orderNumber` varchar(32) NOT NULL,
  `status` enum('pending','dispatched','printing','printed','failed','cancelled') NOT NULL DEFAULT 'pending',
  `source` enum('order_event','operator','reprint') NOT NULL,
  `idempotencyKey` varchar(128) NOT NULL,
  `triggerEventType` varchar(64),
  `triggerEventId` varchar(36),
  `correlationId` varchar(64),
  `payloadVersion` int NOT NULL DEFAULT 1,
  `payloadJson` json NOT NULL,
  `attemptCount` int NOT NULL DEFAULT 0,
  `lastError` text,
  `operatorUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dispatchedAt` timestamp NULL,
  `printingAt` timestamp NULL,
  `completedAt` timestamp NULL,
  CONSTRAINT `print_jobs_id` PRIMARY KEY(`id`),
  CONSTRAINT `print_jobs_idempotency_unique` UNIQUE(`restaurantId`,`idempotencyKey`)
);
--> statement-breakpoint
CREATE INDEX `print_jobs_restaurant_status` ON `print_jobs` (`restaurantId`,`status`);
--> statement-breakpoint
CREATE INDEX `print_jobs_restaurant_order` ON `print_jobs` (`restaurantId`,`orderId`);
--> statement-breakpoint
CREATE TABLE `print_job_attempts` (
  `id` int AUTO_INCREMENT NOT NULL,
  `printJobId` int NOT NULL,
  `restaurantId` int NOT NULL,
  `attemptNumber` int NOT NULL,
  `status` enum('pending','dispatched','printing','printed','failed','cancelled') NOT NULL,
  `outcome` enum('in_progress','success','failure','cancelled') NOT NULL,
  `errorMessage` text,
  `metadataJson` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `print_job_attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `print_job_attempts_job` ON `print_job_attempts` (`printJobId`);
--> statement-breakpoint
CREATE TABLE `print_job_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `printJobId` int NOT NULL,
  `restaurantId` int NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `fromStatus` varchar(32),
  `toStatus` varchar(32) NOT NULL,
  `metadataJson` json,
  `occurredAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `print_job_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `print_job_history_job` ON `print_job_history` (`printJobId`,`occurredAt`);
