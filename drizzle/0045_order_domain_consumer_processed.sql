-- ORDER-EVENTS-1B — idempotent consumer execution ledger
CREATE TABLE `order_domain_consumer_processed` (
  `consumerName` varchar(64) NOT NULL,
  `eventId` varchar(36) NOT NULL,
  `processedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`consumerName`, `eventId`),
  KEY `order_domain_consumer_processed_event` (`eventId`)
);
