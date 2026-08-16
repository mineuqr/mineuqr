-- COMMERCIAL-LIMIT-OCCUPANCY-IMPLEMENTATION-1
-- Tenant-scoped lock token for commercial quantity mutations.
-- Not an occupancy counter. Not a limit. Not a resource.
-- Additive only. Do not apply to Production until a separate Production Apply program.

CREATE TABLE `commercial_limit_occupancy_locks` (
	`scopeKind` varchar(16) NOT NULL,
	`scopeId` int NOT NULL,
	`limitKey` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `commercial_limit_occupancy_locks_pk` PRIMARY KEY(`scopeKind`,`scopeId`,`limitKey`)
);
