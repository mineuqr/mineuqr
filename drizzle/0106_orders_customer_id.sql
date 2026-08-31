-- SALE-CUSTOMER-LINK-1
-- Nullable global Sale (orders) → Customer reference.
-- Does not determine invoice type, taxability, B2B/B2C, VAT, or ZATCA.
-- ON DELETE SET NULL: historical Sales survive Customer deletion.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

ALTER TABLE `orders`
  ADD COLUMN `customerId` int DEFAULT NULL;
--> statement-breakpoint
CREATE INDEX `orders_restaurant_customer_id` ON `orders` (`restaurantId`, `customerId`);
--> statement-breakpoint
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_customer_id_fk`
    FOREIGN KEY (`customerId`) REFERENCES `customers` (`id`)
    ON DELETE SET NULL
    ON UPDATE RESTRICT;
