-- DEVICE-MANAGEMENT-1 — operational device registry and tokens
CREATE TABLE `operational_devices` (
  `deviceId` varchar(64) NOT NULL,
  `restaurantId` int NOT NULL,
  `branchId` int NULL,
  `role` enum(
    'kitchen_display',
    'expo_display',
    'pickup_display',
    'customer_display',
    'print_monitor',
    'self_ordering_kiosk'
  ) NOT NULL,
  `displayName` varchar(128) NOT NULL,
  `status` enum('active','disabled') NOT NULL DEFAULT 'active',
  `reportedVersion` varchar(64) NULL,
  `lastSeenAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `operational_devices_device_id` PRIMARY KEY(`deviceId`)
);
--> statement-breakpoint
CREATE INDEX `operational_devices_restaurant_status` ON `operational_devices` (`restaurantId`, `status`);
--> statement-breakpoint
CREATE INDEX `operational_devices_restaurant_branch` ON `operational_devices` (`restaurantId`, `branchId`);
--> statement-breakpoint
CREATE TABLE `operational_device_tokens` (
  `tokenId` varchar(64) NOT NULL,
  `deviceId` varchar(64) NOT NULL,
  `secretHash` varchar(255) NOT NULL,
  `status` enum('active','revoked','rotated') NOT NULL DEFAULT 'active',
  `issuedAt` timestamp NOT NULL,
  `expiresAt` timestamp NULL,
  `revokedAt` timestamp NULL,
  `lastUsedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `operational_device_tokens_token_id` PRIMARY KEY(`tokenId`)
);
--> statement-breakpoint
CREATE INDEX `operational_device_tokens_device_status` ON `operational_device_tokens` (`deviceId`, `status`);
