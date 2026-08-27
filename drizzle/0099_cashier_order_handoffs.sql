-- CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
-- Durable non-financial membership: restaurantId + orderId.
-- Distinguishes never-sent operational Orders from Orders awaiting Cashier review.
-- Not a money write. Not a second Order. No historical backfill.

CREATE TABLE `cashier_order_handoffs` (
	`restaurantId` int NOT NULL,
	`orderId` int NOT NULL,
	`sourceChannel` varchar(32) NOT NULL,
	`sessionId` int,
	`handedOffAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `cashier_order_handoffs_pk` PRIMARY KEY(`restaurantId`,`orderId`),
	KEY `cashier_order_handoffs_restaurant_handed_off` (`restaurantId`,`handedOffAt`)
);
