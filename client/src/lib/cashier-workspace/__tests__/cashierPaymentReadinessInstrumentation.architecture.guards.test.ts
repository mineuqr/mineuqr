/**
 * CASHIER-PAYMENT-READINESS-INSTRUMENTATION-1 — architecture guards.
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
const SCHEMA = "drizzle/schema.ts";
const JOURNAL = "drizzle/meta/_journal.json";

describe("CASHIER-PAYMENT-READINESS-INSTRUMENTATION-1 architecture", () => {
  it("computes L1 from workflow start to Confirm usable using performance.now", () => {
    const timing = read(TIMING);
    const panel = read(PANEL);
    expect(timing).toContain("paymentReadinessDurationMs");
    expect(timing).toContain("CASHIER_PAYMENT_WORKFLOW_START");
    expect(timing).toContain("CASHIER_PAYMENT_READY");
    expect(timing).toContain("CASHIER_PAYMENT_READINESS_EVENT");
    expect(timing).toContain("cashier_payment_readiness");
    expect(timing).toContain("performance.now");
    const l1Slice = timing.slice(
      timing.indexOf("paymentReadinessDurationMs: elapsed("),
      timing.indexOf("paymentReadinessDurationMs: elapsed(") + 160
    );
    expect(l1Slice).toContain("CASHIER_PAYMENT_WORKFLOW_START");
    expect(l1Slice).toContain("CASHIER_PAYMENT_READY");
    expect(panel).toContain('CASHIER_PAYMENT_WORKFLOW_START');
    expect(panel).toContain('CASHIER_PAYMENT_READY');
    expect(timing).not.toContain("checkReadinessDurationMs: elapsed(\n        m.CASHIER_PAYMENT_WORKFLOW_START");
  });

  it("observes the Confirm-usable gate and does not change it", () => {
    const panel = read(PANEL);
    const confirmDisabled = panel.slice(
      panel.indexOf("cashierPos.primaryAction"),
      panel.indexOf("onClick={() => void completePayment()}")
    );
    expect(confirmDisabled).toContain("paymentReadiness.confirmDisabled");
    expect(confirmDisabled).toContain('paymentRecoveryUi !== "idle"');
    expect(confirmDisabled).toContain("tenderMode == null");
    const readyMark = panel.slice(
      panel.indexOf("!paymentReadiness.confirmDisabled &&"),
      panel.indexOf("listDenied")
    );
    expect(readyMark).toContain("!paymentReadiness.confirmDisabled");
    expect(readyMark).toContain('paymentRecoveryUi === "idle"');
    expect(readyMark).toContain("tenderMode != null");
    expect(readyMark).toContain('CASHIER_PAYMENT_READY');
    expect(readyMark).not.toContain("mutateAsync");
    expect(readyMark).not.toContain("invalidate");
    expect(readyMark).not.toContain("settleMutation");
  });

  it("keeps instrumentation diagnostic-only: no API, DB, money, or second authority", () => {
    const timing = read(TIMING);
    const ready = read(READY);
    const schema = read(SCHEMA);
    const journal = read(JOURNAL);
    expect(timing).not.toContain("mutateAsync");
    expect(timing).not.toContain("fetch(");
    expect(timing).not.toContain("trpc.");
    expect(timing).not.toContain("getDb");
    expect(timing).not.toContain("computeCheckMoney");
    expect(timing).not.toContain("grandTotal");
    expect(timing).not.toContain("finalizeCheckOutcome");
    expect(timing).not.toContain("setTenderMode");
    expect(ready).toContain("previewGrandTotal");
    expect(ready).not.toContain("cashierPaymentFlowTiming");
    expect(schema).not.toMatch(/export const payments\b/);
    expect(schema).not.toMatch(/cashier_payment_readiness/);
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
  });

  it("does not add Check-read HTTP marks or tender-selection timers", () => {
    const timing = read(TIMING);
    const panel = read(PANEL);
    expect(timing).not.toContain("CASHIER_CHECK_READ_START");
    expect(timing).not.toContain("CASHIER_CHECK_READ_RESPONSE");
    expect(timing).not.toContain("CASHIER_TENDER_SELECTED");
    expect(panel).not.toContain("CASHIER_TENDER_SELECTED");
    expect(panel).not.toContain("CASHIER_CHECK_READ_START");
  });
});
