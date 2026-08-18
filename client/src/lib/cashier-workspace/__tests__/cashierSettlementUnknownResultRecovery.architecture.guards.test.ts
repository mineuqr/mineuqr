/**
 * CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1 — read-only recovery guards.
 */
import { readFileSync } from "node:fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const RECOVERY = "client/src/lib/cashier-workspace/cashierSettlementRecovery.ts";
const CLASSIFY =
  "client/src/lib/cashier-workspace/cashierSettlementUnknownResult.ts";
const TELEMETRY =
  "client/src/lib/cashier-workspace/cashierSettlementRecoveryTelemetry.ts";
const CHECK = "server/operational-session/check/CheckService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const ROUTER = "server/pos/api/posRouter.ts";
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("CASHIER-SETTLEMENT-UNKNOWN-RESULT-RECOVERY-1 architecture", () => {
  it("keeps recovery as Check/SR reads with no financial write", () => {
    const recovery = read(RECOVERY);
    const classify = read(CLASSIFY);
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("utils.pos.read.check.getByOrder.fetch");
    expect(completeFn).toContain("utils.settlementRecord.getByCheck.fetch");
    expect(completeFn).toContain("recoverCashierUnknownSettlement");
    expect(completeFn).toContain("classifyCashierSettlementFailure");
    expect(completeFn).toContain("PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE");
    expect(completeFn).toContain('t("recoveryNotCommitted")');
    expect(recovery).toContain("readers.readCheck");
    expect(recovery).toContain("readers.readSettlementRecords");
    expect((completeFn.match(/settleMutation\.mutateAsync/g) ?? []).length).toBe(
      1
    );
    for (const src of [recovery, classify, completeFn]) {
      expect(src).not.toContain("finalizeCheckOutcome");
      expect(src).not.toContain("insertSettlementTransactions");
      expect(src).not.toContain("applyFullSettlementToCheckOrders");
      expect(src).not.toContain("createSettlementRecordForCheckFinalize");
      expect(src).not.toContain("settleCheckPaidByIdDetailed");
    }
    expect(recovery).not.toContain("settleMutation");
    expect(recovery).not.toContain("pos.settlement.initiate");
    expect(recovery).not.toContain("totalAmount");
    expect(recovery).not.toContain("outstandingAmount");
    expect(recovery).not.toContain("listByOrder");
    expect(recovery).not.toMatch(/0\.15|\* 15/);
    expect(recovery + classify + completeFn).not.toContain("refetchInterval");
    expect(recovery).not.toContain("idempotencyKey");
  });

  it("does not treat complimentary, voided, or open as Paid", () => {
    const recovery = read(RECOVERY);
    expect(recovery).toContain('check.outcome === "paid"');
    expect(recovery).toContain('reason: "complimentary"');
    expect(recovery).toContain('reason: "voided"');
    expect(recovery).toContain('reason: "open"');
    expect(recovery).toContain("PAYMENT_CONFIRMED_RECEIPT_INCOMPLETE");
    expect(recovery).toContain(
      "Check paid is money truth. Missing SR read is receipt gap, not unpaid."
    );
  });

  it("does not poll and does not use Order Settlement projection as payment proof", () => {
    const panel = read(PANEL);
    const recovery = read(RECOVERY);
    expect(panel).not.toContain("refetchInterval");
    expect(recovery).not.toContain("orderSettlement");
    expect(recovery).not.toContain("projection");
    expect(completeSlice(panel)).not.toContain(
      "utils.pos.read.orderSettlement"
    );
  });

  it("keeps Attribution post-commit fail-open and settlement idempotency intact", () => {
    const check = read(CHECK);
    const settle = read(SETTLE);
    expect(check).toContain("await adoptSettlementAttributionAfterFinalize(");
    expect(check).toContain("void adoptSettlementAttributionAfterFinalize(");
    expect(settle).toContain("awaitAttribution: false");
    expect(settle).toContain("this.idempotency.runExclusive");
    expect(settle).toContain("this.idempotency.put");
    expect(settle).toContain("check_already_terminal");
  });

  it("does not add schema, POS settlement SQL, or a second revenue root", () => {
    const schema = read(SCHEMA);
    const journal = read(JOURNAL);
    expect(schema).not.toMatch(
      /posSettlementRecovery|cashierPaymentRecovery|pos_unknown_result/
    );
    expect(journal).not.toContain("cashier_settlement_unknown");
    expect(read(RECOVERY)).not.toContain("pos_revenue");
  });

  it("maps POS settlement errors without changing financial ownership", () => {
    const router = read(ROUTER);
    expect(router).toContain("PosSettlementInitiateError");
    expect(router).toContain("getPosSettlementInitiateService()");
    expect(router).not.toContain("settleCheckPaidByIdDetailed");
  });

  it("emits recovery observability without using cashierFlowId as money identity", () => {
    const telemetry = read(TELEMETRY);
    expect(telemetry).toContain("cashier_payment_recovery_started");
    expect(telemetry).toContain("cashier_payment_recovery_check_result");
    expect(telemetry).toContain("cashier_payment_recovery_sr_result");
    expect(telemetry).toContain("cashier_payment_recovery_completed");
    expect(telemetry).not.toContain("cashierFlowId");
    expect(telemetry).not.toContain("paymentMethods");
    expect(telemetry).not.toContain("grandTotal");
  });

  it("scopes recovery reads to restaurant + POS Check read and existing SR getByCheck", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("restaurantId");
    expect(completeFn).toContain("terminalId");
    expect(completeFn).toContain("selectedOrderId");
    expect(completeFn).not.toContain("isOwner");
  });
});

function completeSlice(panel: string): string {
  return panel.slice(
    panel.indexOf("async function completePayment"),
    panel.indexOf("function returnToDashboard")
  );
}
