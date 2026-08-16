-- POS-TERMINAL-ACCESS-IMPLEMENTATION-1
-- POS-scoped permission grants. Not restaurant RBAC. Not Device Management.
-- Additive only. No existing rows are affected (new table).
-- Do not apply to Production until a separate Production Apply program.

CREATE TABLE `pos_permission_grants` (
	`id` varchar(36) NOT NULL,
	`restaurantId` int NOT NULL,
	`userId` int NOT NULL,
	`permission` varchar(32) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL,
	`updatedAt` timestamp NOT NULL,
	CONSTRAINT `pos_permission_grants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pos_permission_grants_unique` ON `pos_permission_grants` (`restaurantId`,`userId`,`permission`);
--> statement-breakpoint
CREATE INDEX `pos_permission_grants_restaurant_user` ON `pos_permission_grants` (`restaurantId`,`userId`);
