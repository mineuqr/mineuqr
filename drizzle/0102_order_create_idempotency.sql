-- ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1
-- Durable Table/QR order.create submission map. Not financial. Not Session identity.
-- PRIMARY KEY (restaurantId, submissionId) is the multi-instance uniqueness authority.
-- No backfill. Existing Orders, Sessions, Checks, and Cashier rows are unchanged.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE IF NOT EXISTS `order_create_idempotency` (
  `restaurantId` int NOT NULL,
  `submissionId` varchar(36) NOT NULL,
  `fingerprint` varchar(64) NOT NULL,
  `orderId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  PRIMARY KEY (`restaurantId`, `submissionId`),
  KEY `order_create_idempotency_order` (`orderId`)
);
