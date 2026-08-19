/**
 * CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1
 * Response-boundary architecture guards. Not a financial redesign.
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

const CHECK = "server/operational-session/check/CheckService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const ADOPTION =
  "server/operational-session/check/checkSettlementAttributionAdoption.ts";
const SESSION = "server/diningSession/sessionService.ts";
const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const RECOVERY =
  "client/src/lib/cashier-workspace/cashierSettlementRecovery.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1 architecture", () => {
  it("does not await Attribution on the Cashier POS response path", () => {
    const pos = read(SETTLE);
    const check = read(CHECK);
    const finalize = sliceFinalizeOpenCheckById(check);
    const settlePaid = pos.slice(
      pos.indexOf("async function defaultSettlePaid"),
      pos.indexOf("function unexplainedFinancialTxnGapMs")
    );
    expect(settlePaid).toContain("awaitAttribution: false");
    expect(settlePaid).toContain("confirmPayment");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).toContain("settleCheckPaidByIdDetailed");
    expect(finalize).toContain("awaitAttribution !== false");
    expect(finalize).toContain("void adoptSettlementAttributionAfterFinalize(");
    const moneyEndAt = finalize.indexOf(
      "const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);"
    );
    expect(
      finalize.indexOf("void adoptSettlementAttributionAfterFinalize(")
    ).toBeGreaterThan(moneyEndAt);
  });

  it("still awaits Attribution for Session settle and never returns success before commit", () => {
    const session = read(SESSION);
    const finalize = sliceFinalizeOpenCheckById(read(CHECK));
    expect(session).toContain("confirmPayment");
    expect(session).not.toContain("awaitAttribution: false");
    expect(finalize).toContain("await adoptSettlementAttributionAfterFinalize(");
    const txAt = finalize.indexOf("await withCheckOwnedTransaction(");
    const moneyEndAt = finalize.indexOf(
      "const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);"
    );
    const returnAfterCommit = finalize.indexOf("return {", moneyEndAt);
    expect(txAt).toBeGreaterThan(-1);
    expect(moneyEndAt).toBeGreaterThan(txAt);
    expect(returnAfterCommit).toBeGreaterThan(moneyEndAt);
  });

  it("keeps Attribution post-commit, fail-open, and outside the money TX", () => {
    const finalize = sliceFinalizeOpenCheckById(read(CHECK));
    const adoption = read(ADOPTION);
    expect(adoption).toContain("Never throws to caller");
    expect(adoption).toContain("Never mutates Settlement Record");
    expect(adoption).toContain("Fail-open");
    const moneyStartAt = finalize.indexOf("const moneyTxStartedAt = Date.now();");
    const moneyEndAt = finalize.indexOf(
      "const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);"
    );
    const moneySlice = finalize.slice(moneyStartAt, moneyEndAt);
    expect(moneySlice).toContain("finalizeCheckOutcome");
    expect(moneySlice).toContain("insertSettlementTransactions");
    expect(moneySlice).toContain("applyFullSettlementToCheckOrders");
    expect(moneySlice).toContain("createSettlementRecordForCheckFinalize");
    expect(moneySlice).not.toContain("adoptSettlementAttributionAfterFinalize");
    expect(moneySlice).not.toContain("createAttribution");
  });

  it("does not introduce a Payment Aggregate, second financial SSOT, or Settlement redesign", () => {
    const check = read(CHECK);
    const pos = read(SETTLE);
    const schema = read(SCHEMA);
    expect(check).not.toMatch(/class PaymentAggregate|type PaymentAggregate/);
    expect(pos).not.toMatch(/class PosPayment|class CashierSettlement/);
    expect(pos).not.toMatch(/PaymentSettlement|posPayments/);
    expect(schema).not.toMatch(
      /export const posPayments|export const cashierSettlements|export const paymentAggregates/
    );
    expect(schema).toContain("export const operationalChecks");
    expect(schema).toContain("export const settlementRecords");
  });

  it("does not write Reporting, create Orders, or bypass Check CAS", () => {
    const finalize = sliceFinalizeOpenCheckById(read(CHECK));
    const pos = read(SETTLE);
    expect(finalize).not.toMatch(/from ["'].*reporting-platform/);
    expect(pos).not.toMatch(/from ["'].*reporting-platform/);
    expect(pos).not.toContain("insertOrder(");
    expect(pos).not.toContain("createOrder(");
    expect(finalize).toContain("finalizeCheckOutcome");
    expect(finalize).toContain("ownedRows === 0");
  });

  it("does not add a schema migration or a second settle during recovery", () => {
    const journal = read(JOURNAL);
    const panel = read(PANEL);
    const recovery = read(RECOVERY);
    expect(journal).not.toContain("cashier_settlement_http_at_commit");
    expect(journal).not.toContain("payment_aggregate");
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect((completeFn.match(/settleMutation\.mutateAsync/g) ?? []).length).toBe(
      1
    );
    expect(recovery).not.toContain("settleMutation");
    expect(recovery).not.toContain("pos.settlement.initiate");
    expect(recovery).not.toContain("settleCheckPaidByIdDetailed");
  });

  it("does not move financial authority to the Cashier client", () => {
    const panel = read(PANEL);
    expect(panel).not.toContain("finalizeCheckOutcome");
    expect(panel).not.toContain("createSettlementRecordForCheckFinalize");
    expect(panel).not.toContain("insertSettlementTransactions");
    expect(panel).toContain("settleMutation.mutateAsync");
  });
});
