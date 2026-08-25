/**
 * PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1 — architecture guards.
 * Execution hardening must not adopt Cashier/Confirm/PAID/Settlement or a payments-table migration.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
const STORE =
  "server/operational-session/payment/collection-fact/InMemoryCollectionFactStore.ts";
const IMMUTABILITY =
  "server/operational-session/payment/collection-fact/collectionFactImmutability.ts";
const ADAPTER =
  "server/reporting-platform/revenue-union/collectionFactReportingAdapter.ts";
const CONFIRM = "server/operational-session/payment/PaymentConfirmService.ts";
const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const PAYMENT_INDEX = "server/operational-session/payment/index.ts";
const SR_REPO = "server/operational-session/check/settlementRecordRepository.ts";
const ST_REPO =
  "server/operational-session/check/settlementTransactionRepository.ts";
const OS_REPO = "server/operational-session/check/orderSettlementRepository.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1 architecture", () => {
  it("24 25 30 Cashier, Confirm, and payment index still do not call the writer", () => {
    const confirm = read(CONFIRM);
    const panel = read(PANEL);
    const settle = read(SETTLE);
    const paymentIndex = read(PAYMENT_INDEX);
    const writer = read(WRITER);
    for (const body of [panel, settle, paymentIndex]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("insertCollectionFact");
      expect(body).not.toContain("createDrizzleCollectionFactStore");
      expect(body).not.toContain("freezeCollectionFact");
    }
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("insertCollectionFact");
    expect(confirm).not.toContain("createDrizzleCollectionFactStore");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(writer).toContain("Cashier Confirm is the first certified");
    expect(writer).toContain("freezeCollectionFact");
    expect(read(STORE)).toContain("freezeCollectionFact");
  });

  it("26 27 28 Settlement does not own Collection Fact; no payments table or Payment aggregate", () => {
    const check = read(CHECK);
    const sr = read(SR_REPO);
    const st = read(ST_REPO);
    const os = read(OS_REPO);
    for (const body of [check, sr, st, os]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("insertCollectionFact");
      expect(body).not.toContain("paymentCollectionFacts");
    }
    const schema = read(SCHEMA);
    expect(schema).toContain("export const paymentCollectionFacts");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(read(WRITER)).not.toContain("settleCheckPaidByIdDetailed");
    expect(read(WRITER)).not.toContain("createSettlementRecordForCheckFinalize");
  });

  it("29 certified 0098 is POS sale idempotency, no Collection Fact UPDATE/DELETE SQL, reporting adapter is read-only", () => {
    const repo = read(REPO);
    const adapter = read(ADAPTER);
    const journal = read(JOURNAL);
    expect(repo).toContain("db.insert(paymentCollectionFacts)");
    expect(repo).not.toContain("onDuplicateKeyUpdate");
    expect(repo).not.toMatch(/\.update\(\s*paymentCollectionFacts/);
    expect(repo).not.toMatch(/\.delete\(\s*paymentCollectionFacts/);
    expect(repo).toContain("assertCollectionFactAppendOnly");
    expect(adapter).toContain(".select()");
    expect(adapter).toContain(".from(paymentCollectionFacts)");
    expect(adapter).not.toContain("commitCollectionFact");
    expect(adapter).not.toContain(".insert(");
    expect(adapter).not.toContain(".update(");
    expect(adapter).not.toContain(".delete(");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0098_payments");
    const sql = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(sql.filter((name) => name.startsWith("0098"))).toEqual([
      "0098_pos_sale_idempotency_open_check.sql",
    ]);
    expect(existsSync(join(repoRoot, "drizzle/0098.sql"))).toBe(false);
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0098).not.toMatch(/payment_collection_facts/);
    expect(sql0098).not.toMatch(/CREATE TABLE `payments`/);
    expect(existsSync(join(repoRoot, IMMUTABILITY))).toBe(true);
  });
});
