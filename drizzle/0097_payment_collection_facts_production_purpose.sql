-- PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1
-- Expand payment_collection_facts.purpose to include production.
-- Isolated purposes remain persistable and MUST NOT publish.
-- Does not create a payments table. Does not alter Check, Settlement, or Cashier.
-- Does not INSERT/UPDATE/DELETE financial rows. Existing rows unchanged.
-- Additive enum value only. Not Cashier adoption. Not a refund/void/complimentary kind.

ALTER TABLE `payment_collection_facts` MODIFY COLUMN `purpose` enum('synthetic','shadow','test','validation','production') NOT NULL;
