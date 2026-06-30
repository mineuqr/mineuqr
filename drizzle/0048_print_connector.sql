-- PRINT-CONNECTOR-1 — per-restaurant printer selection (integration layer only)
CREATE TABLE `print_connector_selections` (
  `restaurantId` int NOT NULL,
  `printerId` varchar(128) NOT NULL,
  `printerName` varchar(255) NOT NULL,
  `platform` varchar(32) NOT NULL,
  `transport` varchar(32) NOT NULL,
  `selectedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `print_connector_selections_restaurant_id` PRIMARY KEY(`restaurantId`)
);
