-- ORDERS-READ-MODEL-1 Phase 2 — projection store (P-01, P-02, P-03, P-04, P-06, P-10, P-11)
CREATE TABLE `order_read_orders` (
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `orderNumber` varchar(32) NOT NULL,
  `status` enum('pending','preparing','ready','served','cancelled') NOT NULL,
  `tableId` int NOT NULL,
  `tableNumber` int NOT NULL,
  `sessionId` int DEFAULT NULL,
  `customerName` varchar(255) DEFAULT NULL,
  `customerPhone` varchar(32) DEFAULT NULL,
  `notes` text,
  `totalAmount` decimal(10,2) NOT NULL,
  `trackingToken` varchar(64) DEFAULT NULL,
  `createdAt` timestamp NOT NULL,
  `readyAt` timestamp NULL DEFAULT NULL,
  `servedAt` timestamp NULL DEFAULT NULL,
  `cancelledAt` timestamp NULL DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT 0,
  `projectionSchemaVersion` int NOT NULL DEFAULT 1,
  `lastEventId` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurantId`,`orderId`),
  KEY `order_read_orders_restaurant_active` (`restaurantId`,`isActive`),
  KEY `order_read_orders_restaurant_status` (`restaurantId`,`status`),
  KEY `order_read_orders_restaurant_created` (`restaurantId`,`createdAt`)
);
--> statement-breakpoint
CREATE TABLE `order_read_order_line_items` (
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `lineItemId` int NOT NULL,
  `menuItemId` int NOT NULL,
  `nameAr` varchar(255) NOT NULL,
  `nameEn` varchar(255) DEFAULT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`restaurantId`,`orderId`,`lineItemId`),
  KEY `order_read_line_items_order` (`restaurantId`,`orderId`)
);
--> statement-breakpoint
CREATE TABLE `order_read_order_timeline` (
  `restaurantId` int NOT NULL,
  `orderId` int NOT NULL,
  `eventId` varchar(36) NOT NULL,
  `fromStatus` varchar(32) DEFAULT NULL,
  `toStatus` varchar(32) NOT NULL,
  `occurredAt` timestamp NOT NULL,
  `projectionSchemaVersion` int NOT NULL DEFAULT 1,
  `lastEventId` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurantId`,`orderId`,`eventId`),
  KEY `order_read_timeline_order` (`restaurantId`,`orderId`,`occurredAt`)
);
--> statement-breakpoint
CREATE TABLE `order_read_operational_kpi_daily` (
  `restaurantId` int NOT NULL,
  `dayKey` varchar(10) NOT NULL,
  `activeOrders` int NOT NULL DEFAULT 0,
  `pendingOrders` int NOT NULL DEFAULT 0,
  `preparingOrders` int NOT NULL DEFAULT 0,
  `readyOrders` int NOT NULL DEFAULT 0,
  `projectionSchemaVersion` int NOT NULL DEFAULT 1,
  `lastEventId` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurantId`,`dayKey`)
);
--> statement-breakpoint
CREATE TABLE `order_read_analytics_daily` (
  `restaurantId` int NOT NULL,
  `dayKey` varchar(10) NOT NULL,
  `orderCount` int NOT NULL DEFAULT 0,
  `completedOrderCount` int NOT NULL DEFAULT 0,
  `completedSales` decimal(12,2) NOT NULL DEFAULT 0.00,
  `projectionSchemaVersion` int NOT NULL DEFAULT 1,
  `lastEventId` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`restaurantId`,`dayKey`)
);
--> statement-breakpoint
CREATE TABLE `order_read_public_order_status` (
  `trackingToken` varchar(64) NOT NULL,
  `restaurantSlug` varchar(128) NOT NULL,
  `restaurantId` int NOT NULL,
  `orderNumber` varchar(32) NOT NULL,
  `status` varchar(32) NOT NULL,
  `tableNumber` int NOT NULL,
  `itemCount` int NOT NULL DEFAULT 0,
  `totalAmount` decimal(10,2) NOT NULL,
  `createdAt` timestamp NOT NULL,
  `readyAt` timestamp NULL DEFAULT NULL,
  `projectionSchemaVersion` int NOT NULL DEFAULT 1,
  `lastEventId` varchar(36) DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`trackingToken`,`restaurantSlug`),
  KEY `order_read_public_restaurant` (`restaurantId`)
);
--> statement-breakpoint
CREATE TABLE `order_read_backfill_runs` (
  `id` varchar(36) NOT NULL,
  `scope` enum('full','tenant','partial') NOT NULL,
  `restaurantId` int DEFAULT NULL,
  `fromDayKey` varchar(10) DEFAULT NULL,
  `toDayKey` varchar(10) DEFAULT NULL,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `rowsProcessed` int NOT NULL DEFAULT 0,
  `attemptCount` int NOT NULL DEFAULT 0,
  `lastError` text,
  `startedAt` timestamp NULL DEFAULT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_read_backfill_restaurant` (`restaurantId`),
  KEY `order_read_backfill_status` (`status`)
);
