/**
 * SPLIT-PAYMENT-PERSISTENCE-1 / ADR-ARCH-024 — persistence architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SPLIT-PAYMENT-PERSISTENCE-1 architecture guards", () => {
  it("migration 0074 creates Split Payment tables with canonical identities", () => {
    const sql = read("drizzle/0074_check_split_payments.sql");
    expect(sql).toContain("SPLIT-PAYMENT-PERSISTENCE-1");
    expect(sql).toContain("CREATE TABLE `check_split_payments`");
    expect(sql).toContain("CREATE TABLE `check_split_payment_attempts`");
    expect(sql).toContain("CREATE TABLE `check_split_payment_tenders`");
    expect(sql).toContain("CREATE TABLE `check_split_payment_tender_allocations`");
    expect(sql).toContain("CREATE TABLE `check_split_payment_allocations`");
    expect(sql).toContain("check_split_payments_payment_id_unique");
    expect(sql).toContain("check_split_payment_attempts_attempt_id_unique");
    expect(sql).toContain("`paymentReference`");
    expect(sql).toContain("`financialReference`");
    expect(sql).toContain("`version`");
    expect(sql).toContain("`externalProviderReference`");
    expect(sql).toContain("--> statement-breakpoint");
  });

  it("Drizzle schema mirrors Domain fields + persistence version/provider ref", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable(\n\t"check_split_payments"');
    expect(schema).toContain('mysqlTable(\n\t"check_split_payment_attempts"');
    expect(schema).toContain("paymentId");
    expect(schema).toContain("paymentReference");
    expect(schema).toContain("financialReference");
    expect(schema).toContain("partially_applied");
    expect(schema).toContain("externalProviderReference");
    const start = schema.indexOf('mysqlTable(\n\t"check_split_payments"');
    const end = schema.indexOf("export type InsertCheckSplitPayment", start);
    const block = schema.slice(start, end);
    expect(block).not.toContain("grandTotal");
    expect(block).not.toContain("impliesFinancialSettlement");
  });

  it("repository has no Domain command / invariant / calculation imports", () => {
    const repo = read(
      "server/operational-session/check/splitPaymentRepository.ts"
    );
    expect(repo).toContain("SessionDbClient");
    expect(repo).toContain("expectedVersion");
    expect(repo).toContain("DUPLICATE");
    expect(repo).toContain("CONFLICT");
    expect(repo).toContain("finalizePaymentAttemptOutcome");
    expect(repo).toContain("historical");
    expect(repo).not.toContain("createSplitPayment");
    expect(repo).not.toContain("allocatePayment");
    expect(repo).not.toContain("assertTransitionAllowed");
    expect(repo).not.toContain("assertCheckConservation");
    expect(repo).not.toContain("calculateOutstandingBalance");
    expect(repo).not.toMatch(/deleteFrom|\.delete\s*\(/);
    expect(repo).not.toContain(".transaction(");
  });

  it("mapper is deterministic and Domain-field scoped", () => {
    const mapper = read(
      "server/operational-session/check/splitPaymentMapper.ts"
    );
    expect(mapper).toContain("mapRowsToSplitPayment");
    expect(mapper).toContain("toSplitPaymentInsertValues");
    expect(mapper).toContain("assertSplitPaymentStatus");
    expect(mapper).toContain("impliesFinancialSettlement: false");
    expect(mapper).not.toContain("allocatePayment");
    expect(mapper).not.toContain("authorizePayment");
  });

  it("Payment Attempt persistence forbids identity reuse / overwrite API", () => {
    const repo = read(
      "server/operational-session/check/splitPaymentRepository.ts"
    );
    expect(repo).toContain("insertPaymentAttempt");
    expect(repo).toContain("finalizePaymentAttemptOutcome");
    expect(repo).toContain("listPaymentAttemptsForCheck");
    expect(repo).not.toContain("deletePaymentAttempt");
    expect(repo).not.toContain("replacePaymentAttempt");
  });

  it("journal terminus is 0074_check_split_payments", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0074_check_split_payments");
    const gov = read("scripts/lib/migration-governance-lib.cjs");
    expect(gov).toContain('CANONICAL_MIGRATION_TAIL_TAG = "0074_check_split_payments"');
    expect(gov).toContain("CANONICAL_JOURNAL_ENTRY_COUNT = 75");
  });

  it("verify-schema covers Split Payment tables", () => {
    const verify = read("scripts/verify-schema-deployment.cjs");
    expect(verify).toContain("check_split_payments");
    expect(verify).toContain("check_split_payment_attempts");
    expect(verify).toContain("check_split_payments_payment_id_unique");
    expect(verify).toContain("check_split_payment_attempts_attempt_id_unique");
  });
});
