/**
 * PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 — non-adoption + ownership guards.
 * Collection Fact infrastructure must remain dormant vs Cashier / PAID / Revenue / Settlement.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const WRITER =
  "server/operational-session/payment/collection-fact/CollectionFactService.ts";
const REPO =
  "server/operational-session/payment/collection-fact/collectionFactRepository.ts";
const CONFIRM = "server/operational-session/payment/PaymentConfirmService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const ROUTER = "server/pos/api/posRouter.ts";
const SALE = "server/pos/services/PosSaleService.ts";
const REVENUE = "server/reporting-platform/businessMetricsAggregator.ts";
const SR_REPO = "server/operational-session/check/settlementRecordRepository.ts";
const ST_REPO =
  "server/operational-session/check/settlementTransactionRepository.ts";
const PAYMENT_INDEX = "server/operational-session/payment/index.ts";

describe("PAYMENT-COLLECTION-FACT-IMPLEMENTATION-1 non-adoption", () => {
  it("owns Collection Fact under Payment collection-fact, not Confirm/Check/UI/Reporting", () => {
    const writer = read(WRITER);
    expect(writer).toContain("export async function commitCollectionFact");
    expect(writer).toContain("NOT connected to Cashier Confirm");
    expect(read(PAYMENT_INDEX)).not.toContain("commitCollectionFact");
    expect(read(PAYMENT_INDEX)).toContain("confirmPayment");
    expect(read(REPO)).toContain("assertCollectionFactAppendOnly");
    expect(read(REPO)).toContain("updateCollectionFact");
    expect(read(REPO)).toContain("deleteCollectionFact");
  });

  it("does not connect Cashier Confirm, PAID, or sale.create to the Collection Fact writer", () => {
    const confirm = read(CONFIRM);
    const settle = read(SETTLE);
    const check = read(CHECK);
    const panel = read(PANEL);
    const router = read(ROUTER);
    const sale = read(SALE);
    for (const body of [confirm, settle, check, panel, router, sale]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("collection-fact");
      expect(body).not.toContain("paymentCollectionFacts");
      expect(body).not.toContain("insertCollectionFact");
    }
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(confirm).toContain("await settleCheckPaidByIdDetailed({");
    expect(settle).toContain("confirmPayment");
    expect(check).toContain("createSettlementRecordForCheckFinalize");
  });

  it("does not contribute Collection Facts to Revenue or Settlement", () => {
    const revenue = read(REVENUE);
    const sr = read(SR_REPO);
    const st = read(ST_REPO);
    expect(revenue).not.toContain("payment_collection_facts");
    expect(revenue).not.toContain("paymentCollectionFacts");
    expect(revenue).not.toContain("commitCollectionFact");
    expect(sr).not.toContain("commitCollectionFact");
    expect(sr).not.toContain("paymentCollectionFacts");
    expect(st).not.toContain("commitCollectionFact");
    expect(st).not.toContain("paymentCollectionFacts");
  });

  it("requires non-production purpose and insert-only uniqueness", () => {
    const sql = read("drizzle/0096_payment_collection_facts.sql");
    expect(sql).toContain("CREATE TABLE `payment_collection_facts`");
    expect(sql).toMatch(
      /`purpose` enum\('synthetic','shadow','test','validation'\) NOT NULL/
    );
    expect(sql).not.toMatch(
      /`purpose` enum\('synthetic','shadow','test','validation','production'\)/
    );
    expect(sql).toContain("payment_collection_facts_idempotency_unique");
    expect(sql).toContain("payment_collection_facts_intent_unique");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/FOREIGN KEY/i);
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("export const paymentCollectionFacts");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
  });
});
