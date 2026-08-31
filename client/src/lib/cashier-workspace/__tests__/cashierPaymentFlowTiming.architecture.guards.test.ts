/**
 * CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const TIMING = "client/src/lib/cashier-workspace/cashierPaymentFlowTiming.ts";
const READY = "client/src/lib/cashier-workspace/cashierPaymentReadiness.ts";
const SALE = "server/pos/services/PosSaleService.ts";
const INTAKE = "server/pos/services/PosCheckIntakeService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const READ = "server/pos/services/PosCheckReadService.ts";
const SCHEMA = "drizzle/schema.ts";

describe("CASHIER-PAYMENT-FLOW-BOUNDARY-INSTRUMENTATION-1 architecture", () => {
  it("observes existing payment readiness and does not invent a second algorithm", () => {
    const panel = read(PANEL);
    const ready = read(READY);
    const timing = read(TIMING);
    expect(panel).toContain("cashierPaymentFlowTiming");
    expect(panel).toContain("CASHIER_ORDER_CONFIRM_CLICK");
    expect(panel).toContain("CASHIER_PAYMENT_CONFIRM_CLICK");
    expect(panel).toContain("CASHIER_PAYMENT_READY");
    expect(panel).toContain("resolveCashierPaymentReadiness");
    expect(panel).toContain("paymentReadiness.canConfirmPayment");
    expect(timing).toContain("performance.now");
    expect(timing).toContain("paymentReadinessDurationMs");
    expect(timing).not.toContain("grandTotal");
    expect(timing).not.toContain("taxAmount");
    expect(timing).not.toContain("subtotal");
    expect(timing).not.toContain("computeCheckMoney");
    expect(ready).toContain("previewGrandTotal");
  });

  it("does not persist cashierFlowId as business, financial, or idempotency identity", () => {
    const panel = read(PANEL);
    const timing = read(TIMING);
    const schema = read(SCHEMA);
    expect(timing).toContain("cashier-flow-");
    expect(panel).not.toContain("idempotencyKey: cashierFlowId");
    expect(panel).not.toContain("idempotencyKey: flowId");
    expect(panel).toContain('newCashierIdempotencyKey("settle")');
    expect(schema).not.toMatch(/cashierFlowId|cashier_payment_flow/);
    expect(schema).not.toMatch(/export const cashierPaymentFlows/);
  });

  it("does not change Check, settlement, sale, Relay, or polling architecture", () => {
    const sale = read(SALE);
    const intake = read(INTAKE);
    const settle = read(SETTLE);
    const readSvc = read(READ);
    const panel = read(PANEL);
    const settlementBlock = panel.slice(
      panel.indexOf("trpc.pos.read.orderSettlement.listByOrder"),
      panel.indexOf("trpc.pos.read.check.getByOrder")
    );
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(intake).toContain("ensureCheckForOrder");
    expect(settle).toContain("confirmPayment");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(settle).toContain("getCheckById");
    expect(readSvc).toContain("getCheckById");
    expect(readSvc).not.toContain("ensureCheckForOrder");
    expect(settlementBlock).not.toContain("refetchInterval");
    // SAUDI-TAX-INVOICE-CASHIER-UX-1 may poll getPhase1ByOrder after PAID.
    // Payment / Check / settlement / active-order reads must stay non-polling.
    expect(panel).toContain("saudiTaxInvoice.getPhase1ByOrder");
    expect([...panel.matchAll(/refetchInterval/g)]).toHaveLength(1);
    const saudiQueryBlock = panel.slice(
      panel.indexOf("saudiTaxInvoice.getPhase1ByOrder"),
      panel.indexOf("saudiTaxInvoice.getPhase1ByOrder") + 800
    );
    expect(saudiQueryBlock).toContain("refetchInterval");
    expect(panel).not.toMatch(
      /trpc\.pos\.read\.(orders|check|orderSettlement)[\s\S]{0,400}refetchInterval/
    );
  });

  it("adds duration telemetry without logging financial amounts on Check read", () => {
    const intake = read(INTAKE);
    const settle = read(SETTLE);
    const readSvc = read(READ);
    expect(intake).toContain("durationMs");
    expect(intake).toContain("startedAt");
    expect(intake).toContain("completedAt");
    expect(intake).toContain("OPS_EVENT.pos_check_intake");
    expect(settle).toContain("durationMs");
    expect(settle).toContain('type: "pos_settlement_initiate"');
    expect(readSvc).toContain('type: "pos_check_read"');
    expect(readSvc).toContain("resultState");
    const logSlice = readSvc.slice(
      readSvc.indexOf("opsLog({"),
      readSvc.indexOf("opsLog({") + 900
    );
    expect(logSlice).toContain("durationMs");
    expect(logSlice).not.toContain("grandTotal");
    expect(logSlice).not.toContain("taxAmount");
    expect(logSlice).not.toContain("subtotal");
  });
});
