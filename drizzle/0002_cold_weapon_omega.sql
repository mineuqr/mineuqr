CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'USD',
	`status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`invoiceNumber` varchar(64) NOT NULL,
	`pdfUrl` text,
	`issuedAt` timestamp NOT NULL,
	`dueAt` timestamp NOT NULL,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `renewal_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`subscriptionId` int NOT NULL,
	`notificationType` enum('7_days_before','1_day_before','on_renewal','failed_renewal') NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`isSent` boolean NOT NULL DEFAULT false,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
