/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — architecture guards.
 * Contract is channel-independent, not Cashier-owned, and not a second financial root.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_FACT_FINALITY,
  COLLECTION_FACT_IDENTITY,
  PRODUCTION_COLLECTION_FACT_COMMIT_PROGRAM_ID,
} from "@shared/operational-session/payment/collection-fact";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const CONTRACT =
  "shared/operational-session/payment/collection-fact/productionCollectionFactCommitContract.ts";
const WRITER =
  "server/operational-session/payment/collection-fact/CollectionFactService.ts";
const CONFIRM = "server/operational-session/payment/PaymentConfirmService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const ROUTER = "server/pos/api/posRouter.ts";
const SALE = "server/pos/services/PosSaleService.ts";
const PAYMENT_INDEX = "server/operational-session/payment/index.ts";
const SR_REPO = "server/operational-session/check/settlementRecordRepository.ts";
const ST_REPO =
  "server/operational-session/check/settlementTransactionRepository.ts";
const OS_REPO = "server/operational-session/check/orderSettlementRepository.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 architecture", () => {
  it("S T U is not Cashier-owned and does not adopt Confirm or Cashier writes", () => {
    expect(CONTRACT.startsWith("shared/operational-session/payment/collection-fact")).toBe(
      true
    );
    const contract = read(CONTRACT);
    const writer = read(WRITER);
    const confirm = read(CONFIRM);
    const panel = read(PANEL);
    const settle = read(SETTLE);
    const sale = read(SALE);
    const router = read(ROUTER);
    const paymentIndex = read(PAYMENT_INDEX);
    expect(contract).toContain(PRODUCTION_COLLECTION_FACT_COMMIT_PROGRAM_ID);
    expect(contract).not.toContain("cashier-workspace");
    expect(contract).not.toContain("CashierWorkspacePanel");
    expect(writer).toContain("assertProductionCollectionFactCommit");
    expect(writer).toContain("Cashier Confirm is the first certified");
    expect(paymentIndex).not.toContain("commitCollectionFact");
    expect(paymentIndex).toContain("confirmPayment");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("insertCollectionFact");
    expect(panel).not.toContain("commitCollectionFact");
    expect(settle).not.toContain("commitCollectionFact");
    expect(sale).not.toContain("commitCollectionFact");
    expect(router).not.toContain("commitCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(confirm).toContain("await settleCheckPaidByIdDetailed({");
  });

  it("P Q V does not introduce a Payment aggregate, payments table, or second PAID entity", () => {
    const schema = read(SCHEMA);
    const journal = read(JOURNAL);
    const contract = read(CONTRACT);
    expect(COLLECTION_FACT_IDENTITY.payment).toBe("paymentIntentId");
    expect(COLLECTION_FACT_FINALITY.paid).toContain("not a second financial authority");
    expect(contract).toContain("There is no separate payments table or Payment aggregate");
    expect(schema).toContain("export const paymentCollectionFacts");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).not.toMatch(
      /export const payments\b|export const paymentAggregates|export const paidFacts/
    );
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).toContain("0097_payment_collection_facts_production_purpose");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0098_payments");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(drizzleFiles.filter((name) => name.startsWith("0098"))).toEqual([
      "0098_pos_sale_idempotency_open_check.sql",
    ]);
    expect(existsSync(join(repoRoot, "drizzle/0098.sql"))).toBe(false);
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0098).not.toMatch(/payment_collection_facts/);
    expect(sql0098).not.toMatch(/CREATE TABLE `payments`/);
  });

  it("W does not change Check, PAID runtime, or ST/OS/SR writers", () => {
    const check = read(CHECK);
    const sr = read(SR_REPO);
    const st = read(ST_REPO);
    const os = existsSync(join(repoRoot, OS_REPO)) ? read(OS_REPO) : "";
    for (const body of [check, sr, st, os]) {
      if (!body) continue;
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("assertProductionCollectionFactCommit");
      expect(body).not.toContain("paymentCollectionFacts");
    }
    expect(check).toContain("createSettlementRecordForCheckFinalize");
    expect(sr).not.toContain("payment_collection_facts");
    expect(st).not.toContain("payment_collection_facts");
  });

  it("X remains channel-independent and does not make Check or Settlement the new financial authority", () => {
    const contract = read(CONTRACT);
    expect(contract).toContain("Channel-independent");
    expect(contract).toContain("Not Cashier-owned");
    expect(contract).toContain("economicSale");
    expect(contract).not.toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(contract).toContain("optional operational bill reference");
    expect(read(WRITER)).not.toContain("settleCheckPaidByIdDetailed");
    expect(read(WRITER)).not.toContain("createSettlementRecordForCheckFinalize");
    expect(read("server/reporting-platform/businessMetricsAggregator.ts")).not.toContain(
      "commitCollectionFact"
    );
  });
});
