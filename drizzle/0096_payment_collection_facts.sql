-- PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 / ADR-ARCH-039
-- Immutable Payment Collection Fact storage (insert-only write model).
-- Dormant financial authority infrastructure. Not adopted into Cashier.
-- Not a payments table. Not Check authority. Not Revenue. Not Settlement.
-- purpose is required and excludes production collections (synthetic|shadow|test|validation).
-- No FKs — application-level integrity, matches settlement_records / check_charges.
-- Unique (restaurantId, paymentIntentId) and (restaurantId, idempotencyKey).
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

CREATE TABLE `payment_collection_facts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionFactId` varchar(128) NOT NULL,
	`restaurantId` int NOT NULL,
	`orderId` int NOT NULL,
	`paymentIntentId` varchar(128) NOT NULL,
	`orderingChannel` varchar(32) NOT NULL,
	`kind` enum('collection') NOT NULL DEFAULT 'collection',
	`purpose` enum('synthetic','shadow','test','validation') NOT NULL,
	`schemaVersion` int NOT NULL DEFAULT 1,
	`subtotal` decimal(10,2) NOT NULL,
	`discountAmount` decimal(10,2) NOT NULL DEFAULT '0.00',
	`taxAmount` decimal(10,2) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`currencyCode` varchar(8) NOT NULL,
	`currencySnapshotJson` json NOT NULL,
	`taxPolicySnapshotJson` json NOT NULL,
	`taxBreakdownJson` json NOT NULL,
	`compositionJson` json NOT NULL,
	`tendersJson` json NOT NULL,
	`checkId` int,
	`actorType` varchar(64),
	`actorId` varchar(128),
	`terminalId` varchar(128),
	`businessDay` varchar(10) NOT NULL,
	`idempotencyKey` varchar(128) NOT NULL,
	`fingerprint` varchar(64) NOT NULL,
	`committedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `payment_collection_facts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_collection_facts_fact_id_unique` ON `payment_collection_facts` (`collectionFactId`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_collection_facts_idempotency_unique` ON `payment_collection_facts` (`restaurantId`,`idempotencyKey`);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_collection_facts_intent_unique` ON `payment_collection_facts` (`restaurantId`,`paymentIntentId`);
--> statement-breakpoint
CREATE INDEX `payment_collection_facts_restaurant_id` ON `payment_collection_facts` (`restaurantId`);
--> statement-breakpoint
CREATE INDEX `payment_collection_facts_restaurant_order` ON `payment_collection_facts` (`restaurantId`,`orderId`);
--> statement-breakpoint
CREATE INDEX `payment_collection_facts_restaurant_purpose` ON `payment_collection_facts` (`restaurantId`,`purpose`);
--> statement-breakpoint
CREATE INDEX `payment_collection_facts_business_day` ON `payment_collection_facts` (`businessDay`);
--> statement-breakpoint
CREATE INDEX `payment_collection_facts_channel` ON `payment_collection_facts` (`restaurantId`,`orderingChannel`);
