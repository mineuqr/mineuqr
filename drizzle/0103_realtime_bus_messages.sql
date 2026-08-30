-- REALTIME-MULTI-INSTANCE-FANOUT-1
-- Infrastructure-only ephemeral fan-out bus for cross-instance Realtime hints.
-- Not a business ledger. Not Order/Financial/Settlement/Drawer/Refund authority.
-- Rows are short-lived metadata envelopes (TTL cleanup by publisher/poller).
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `realtime_bus_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `eventId` varchar(64) NOT NULL,
  `originInstanceId` varchar(64) NOT NULL,
  `restaurantId` int NOT NULL,
  `channel` varchar(64) NOT NULL,
  `hintJson` json NOT NULL,
  `createdAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `realtime_bus_messages_event_id_unique` (`eventId`),
  KEY `realtime_bus_messages_created` (`createdAt`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `realtime_ticket_revocations` (
  `jti` varchar(64) NOT NULL,
  `revokedAt` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` timestamp(3) NOT NULL,
  PRIMARY KEY (`jti`),
  KEY `realtime_ticket_revocations_expires` (`expiresAt`)
);
