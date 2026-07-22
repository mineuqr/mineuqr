-- CHECK-GENERALIZATION-M4-SESSION-OPTIONALITY-1 / ADR-ARCH-020
-- Make Check.sessionId and SettlementTransaction.sessionId optional.
-- Session remains valid for table visits; null for sessionless finance.
-- TiDB: one statement per breakpoint (errno 8130 multi-statement disabled).

ALTER TABLE `operational_checks`
  MODIFY COLUMN `sessionId` INT NULL;
--> statement-breakpoint
ALTER TABLE `check_settlement_transactions`
  MODIFY COLUMN `sessionId` INT NULL;
