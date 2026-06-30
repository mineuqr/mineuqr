-- PRINT-CONNECTOR-PERSISTENCE-1 — durable connector pairing and enrollment
CREATE TABLE `connector_pairing_tokens` (
  `token` varchar(128) NOT NULL,
  `restaurantId` int NOT NULL,
  `expiresAt` timestamp NOT NULL,
  `consumedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `connector_pairing_tokens_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE INDEX `connector_pairing_tokens_restaurant` ON `connector_pairing_tokens` (`restaurantId`);
--> statement-breakpoint
CREATE TABLE `connector_enrollments` (
  `credentialId` varchar(128) NOT NULL,
  `restaurantId` int NOT NULL,
  `connectorInstanceId` varchar(128) NOT NULL,
  `secretHash` varchar(255) NOT NULL,
  `status` enum('active','revoked') NOT NULL DEFAULT 'active',
  `connectorVersion` varchar(32),
  `issuedAt` timestamp NOT NULL,
  `expiresAt` timestamp NULL,
  `revokedAt` timestamp NULL,
  `lastSeenAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `connector_enrollments_credential_id` PRIMARY KEY(`credentialId`),
  CONSTRAINT `connector_enrollments_instance_unique` UNIQUE(`connectorInstanceId`)
);
--> statement-breakpoint
CREATE INDEX `connector_enrollments_restaurant_status` ON `connector_enrollments` (`restaurantId`, `status`);
