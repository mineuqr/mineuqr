-- PRINT-UX-1 — restaurant printer catalog (management workspace)
CREATE TABLE `restaurant_printers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `restaurantId` int NOT NULL,
  `printerId` varchar(128) NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `transport` varchar(32) NOT NULL,
  `isDefault` tinyint(1) NOT NULL DEFAULT 0,
  `isActive` tinyint(1) NOT NULL DEFAULT 1,
  `lastValidatedAt` timestamp NULL,
  `capabilitiesJson` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `restaurant_printers_id` PRIMARY KEY(`id`),
  CONSTRAINT `restaurant_printers_unique` UNIQUE(`restaurantId`,`printerId`)
);
--> statement-breakpoint
CREATE INDEX `restaurant_printers_restaurant_default` ON `restaurant_printers` (`restaurantId`,`isDefault`);
