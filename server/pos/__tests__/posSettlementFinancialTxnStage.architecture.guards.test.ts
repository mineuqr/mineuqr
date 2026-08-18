/**
 * CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1
 * Observability-only architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceFinalizeOpenCheckById(src: string): string {
  const start = src.indexOf("async function finalizeOpenCheckById");
  const end = src.indexOf("// ─── M4 Check-centric financial APIs", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1 architecture", () => {
  it("instruments existing finalize stages without moving financial work", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const finalize = sliceFinalizeOpenCheckById(check);
    const reloadAt = finalize.indexOf("await getCheckById(");
    const discoveryAt = finalize.indexOf("await loadOrdersSubtotal(");
    const contextAt = finalize.indexOf("await resolveSettlementContextForSettle(");
    const moneyStartAt = finalize.indexOf("const moneyTxStartedAt = Date.now();");
    const txAt = finalize.indexOf("await withCheckOwnedTransaction(");
    const moneyEndAt = finalize.indexOf(
      "const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);"
    );
    const attributionAt = finalize.indexOf(
      "await adoptSettlementAttributionAfterFinalize("
    );
    expect(reloadAt).toBeGreaterThan(-1);
    expect(discoveryAt).toBeGreaterThan(reloadAt);
    expect(contextAt).toBeGreaterThan(discoveryAt);
    expect(moneyStartAt).toBeGreaterThan(contextAt);
    expect(txAt).toBeGreaterThan(moneyStartAt);
    expect(moneyEndAt).toBeGreaterThan(txAt);
    expect(attributionAt).toBeGreaterThan(moneyEndAt);
    const moneySlice = finalize.slice(moneyStartAt, moneyEndAt);
    expect(moneySlice).toContain("finalizeCheckOutcome");
    expect(moneySlice).toContain("insertSettlementTransactions");
    expect(moneySlice).toContain("applyFullSettlementToCheckOrders");
    expect(moneySlice).toContain("createSettlementRecordForCheckFinalize");
    expect(moneySlice).not.toContain("getCheckById(");
    expect(moneySlice).not.toContain("loadOrdersSubtotal(");
    expect(moneySlice).not.toContain("resolveSettlementContextForSettle");
    expect(moneySlice).not.toContain("adoptSettlementAttributionAfterFinalize");
    expect(moneySlice).not.toContain("Promise.all");
  });

  it("does not reuse outer Settlement Context or remove duplicate resolution", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const check = read("server/operational-session/check/CheckService.ts");
    expect(pos).toContain("settlementContextHints");
    expect(pos).toContain("settleCheckPaidByIdDetailed");
    const settlePaid = pos.slice(
      pos.indexOf("async function defaultSettlePaid"),
      pos.indexOf("function unexplainedFinancialTxnGapMs")
    );
    expect(settlePaid).toContain("settlementContextHints:");
    expect(settlePaid).not.toMatch(/settlementContext:\s*operational/);
    expect(settlePaid).not.toMatch(/settlementContext:\s*context/);
    expect(check).toContain("resolveSettlementContextForSettle");
    expect(check).toContain("input.settlementContext ??");
  });

  it("does not await Relay, enroll Check on POS sale, or change schema", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("awaitRelay: true");
    expect(sale).not.toContain("enrollCheck: true");
    expect(schema).not.toMatch(
      /export const posFinancialTxnStages|export const cashierSettlementStages/
    );
    expect(journal).not.toContain("financial_txn_stage");
    expect(journal).toContain("0094_commercial_limit_occupancy_locks");
  });

  it("emits stage timings on existing pos_settlement_initiate without financial amounts", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const taxonomy = read("server/_core/opsTaxonomy.ts");
    expect(taxonomy).toContain("pos_settlement_initiate");
    const logStart = pos.lastIndexOf('type: "pos_settlement_initiate"');
    const logEnd = pos.indexOf("return resultFrom", logStart);
    const logSlice = pos.slice(logStart, logEnd);
    expect(logSlice).toContain("category: \"ORDER\"");
    expect(logSlice).toContain("financialTxnMs");
    expect(logSlice).toContain("checkReloadMs");
    expect(logSlice).toContain("orderDiscoveryMs");
    expect(logSlice).toContain("contextResolveMs");
    expect(logSlice).toContain("moneyTxMs");
    expect(logSlice).toContain("attributionMs");
    expect(logSlice).toContain("unexplainedGapMs");
    expect(logSlice).not.toContain("grandTotal");
    expect(logSlice).not.toContain("taxAmount");
    expect(logSlice).not.toContain("subtotal");
    expect(logSlice).not.toContain("tender");
  });

  it("does not change client payment-flow timing logic", () => {
    const timing = read(
      "client/src/lib/cashier-workspace/cashierPaymentFlowTiming.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(timing).not.toContain("checkReloadMs");
    expect(timing).not.toContain("moneyTxMs");
    expect(timing).not.toContain("contextResolveMs");
    expect(timing).not.toContain("attributionMs");
    expect(panel).not.toContain("moneyTxMs");
    expect(panel).not.toContain("checkReloadMs");
  });
});
