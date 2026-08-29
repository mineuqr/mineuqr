/**
 * CASHIER-INCOMING-CONFIRM-PENDING-ATTEMPT-SCOPE-1
 * Pending Confirm attempt is Order-scoped. Item snapshot is same-Order
 * validation only. Incoming B must not inherit Attempt A.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const STORAGE =
  "client/src/lib/cashier-workspace/cashierPendingSaleAttemptStorage.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";

describe("CASHIER-INCOMING-CONFIRM-PENDING-ATTEMPT-SCOPE-1", () => {
  it("stores orderId on the pending attempt and uses it as identity", () => {
    const storage = read(STORAGE);
    expect(storage).toContain("orderId?: number | null");
    expect(storage).toContain("export function cashierPendingSaleAttemptAppliesToOrder");
    expect(storage).toContain("if (current != null) return stored === current");
    expect(storage).toContain(
      "A legacy attempt without orderId cannot apply to a known Incoming Order"
    );
  });

  it("Confirm applies item retry only after the attempt belongs to the current Order", () => {
    const completeFn = read(PANEL).slice(
      read(PANEL).indexOf("async function completePayment"),
      read(PANEL).indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("cashierPendingSaleAttemptAppliesToOrder");
    expect(completeFn).toContain("orderId: inboundOrderId");
    expect(completeFn).toContain("saleAttemptOrderIdRef.current = inboundOrderId");
    const applyAt = completeFn.indexOf("cashierPendingSaleAttemptAppliesToOrder");
    const itemAt = completeFn.indexOf("cashierTicketMatchesSaleAttempt");
    expect(applyAt).toBeGreaterThan(-1);
    expect(itemAt).toBeGreaterThan(applyAt);
    expect(completeFn).toContain("settleKeyRef.current = null");
  });

  it("failed Confirm still keeps the same-Order attempt", () => {
    const completeFn = read(PANEL).slice(
      read(PANEL).indexOf("async function completePayment"),
      read(PANEL).indexOf("function returnToDashboard")
    );
    const catchFn = completeFn.slice(completeFn.indexOf("} catch (error)"));
    expect(catchFn).not.toContain("settleKeyRef.current = null");
    expect(catchFn).not.toContain("clearCashierPendingSaleAttempt");
    expect(completeFn).toContain("startNewSale()");
  });

  it("startNewSale still clears the pending attempt", () => {
    const startNew = read(PANEL).slice(
      read(PANEL).indexOf("function startNewSale"),
      read(PANEL).indexOf("function cancelPaymentSheet")
    );
    expect(startNew).toContain("clearCashierPendingSaleAttempt(restaurantId)");
    expect(startNew).toContain("saleAttemptOrderIdRef.current = null");
  });

  it("Incoming Confirm still sends orderId and server fingerprint still includes orderId", () => {
    const completeFn = read(PANEL).slice(
      read(PANEL).indexOf("async function completePayment"),
      read(PANEL).indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("orderId: inboundOrderId");
    expect(completeFn).toContain("idempotencyKey: settleKeyRef.current");
    expect(read(SETTLE)).toContain("orderId: order?.id ?? null");
  });

  it("placeSale uses the same Order-scope gate so Incoming is not a Kiosk-only branch", () => {
    const placeSaleFn = read(PANEL).slice(
      read(PANEL).indexOf("function placeSale"),
      read(PANEL).indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain("cashierPendingSaleAttemptAppliesToOrder");
    expect(placeSaleFn).toContain("cashierTicketMatchesSaleAttempt");
    expect(read(PANEL)).toContain("function reviewInvoiceIntent");
    expect(read(PANEL)).not.toContain("ORDERING_CHANNEL_KIOSK");
  });
});
