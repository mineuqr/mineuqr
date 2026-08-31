-- SAUDI-TAX-PROFILE-1
-- Country-specific Saudi Tax Profile for Compliance Layer readiness.
-- Not Tax Invoice. Not Customer. Not ZATCA/Fatoora integration.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `saudi_tax_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `restaurantId` int NOT NULL,
  `countryCode` varchar(2) NOT NULL DEFAULT 'SA',
  `legalName` varchar(255) NOT NULL,
  `vatRegistrationStatus` enum('unknown','not_registered','registered') NOT NULL DEFAULT 'unknown',
  `vatNumber` varchar(32) DEFAULT NULL,
  `registeredAddress` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `saudi_tax_profiles_restaurant_unique` (`restaurantId`),
  KEY `saudi_tax_profiles_restaurant_id` (`restaurantId`)
);
