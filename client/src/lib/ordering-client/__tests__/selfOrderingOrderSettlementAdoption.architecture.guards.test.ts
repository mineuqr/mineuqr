/**
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 guards", () => {
  it("Orders Workspace settles sessionless via staff façade + MarkPaidSettlementDialog", () => {
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    expect(panel).toContain("SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1");
    expect(panel).toContain("MarkPaidSettlementDialog");
    expect(panel).toContain("staffSettleCounterPickup");
    expect(panel).toContain("staffCancelCounterPickup");
    expect(panel).toContain("listUnpaidCounterPickup");
    expect(panel).toContain("settle-self-ordering");
    expect(panel).toContain("readActiveRegister");
    expect(panel).toContain("useFinancialShiftCurrent");
    expect(panel).not.toContain("session.markPaid");
    expect(panel).not.toContain("ensureOpenCheckForSession");
  });

  it("does not fabricate Sessions or redesign money platform", () => {
    const panel = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    const svc = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    expect(panel).not.toMatch(/createSession|openSession|fabricat/i);
    expect(svc).toContain("settleCheckPaidByIdDetailed");
    expect(svc).toContain("voidCheckByIdDetailed");
    expect(svc).toContain("SHIFT_REQUIRED");
    expect(svc).toContain("REGISTER_REQUIRED");
  });

  it("kiosk checkout remains non-settling", () => {
    const checkout = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(checkout).not.toContain("staffSettleCounterPickup");
    expect(checkout).not.toContain("order.settlePaid");
    expect(checkout).not.toContain("MarkPaidSettlementDialog");
  });

  it("action catalog includes settle without Session redirect", () => {
    const actions = read(
      "client/src/lib/operational-workspace/operationalActions.ts"
    );
    expect(actions).toContain("settle-self-ordering");
    expect(actions).toContain("getOrdersWorkspaceActions");
    expect(actions).toContain("SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1");
    expect(actions).not.toContain("Sessions");
  });
});
