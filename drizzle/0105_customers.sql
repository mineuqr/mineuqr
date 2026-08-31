-- CUSTOMER-FOUNDATION-1
-- Global tenant-scoped Customer table. Country-agnostic.
-- Not Tax Invoice. Not Saudi-specific columns. Not financial authority.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurantId` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `customerType` enum('individual','business') NOT NULL DEFAULT 'individual',
  `phone` varchar(32) DEFAULT NULL,
  `email` varchar(320) DEFAULT NULL,
  `address` text,
  `taxNumber` varchar(64) DEFAULT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customers_restaurant_status` (`restaurantId`,`status`),
  KEY `customers_restaurant_type` (`restaurantId`,`customerType`),
  KEY `customers_restaurant_phone` (`restaurantId`,`phone`)
);
