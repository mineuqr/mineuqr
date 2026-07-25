/**
 * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — Phase 4 architecture guards.
 * REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1 — unpaid queue left Register Ops.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 Phase 4 guards", () => {
  it("staff settle façade reuses Check settle + requires Register/Shift", () => {
    const svc = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    expect(svc).toContain("SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1");
    expect(svc).toContain("settleCheckPaidByIdDetailed");
    expect(svc).toContain("voidCheckByIdDetailed");
    expect(svc).toContain("SHIFT_REQUIRED");
    expect(svc).toContain("REGISTER_REQUIRED");
    expect(svc).not.toContain("markPaid");
    expect(svc).not.toContain("ensureOpenCheckForSession");
  });

  it("staff APIs are verifiedProcedure; kiosk still avoids settle", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("staffSettleCounterPickup: verifiedProcedure");
    expect(routers).toContain("staffCancelCounterPickup: verifiedProcedure");
    expect(routers).toContain("listUnpaidCounterPickup: verifiedProcedure");
    expect(routers).toContain("settlePaid: publicProcedure");

    const checkout = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(checkout).not.toContain("staffSettleCounterPickup");
    expect(checkout).not.toContain("order.settlePaid");
  });

  it("Orders Workspace owns unpaid settle UI; Register Ops does not", () => {
    const orders = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    const ops = read(
      "client/src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(orders).toContain("MarkPaidSettlementDialog");
    expect(orders).toContain("staffSettleCounterPickup");
    expect(orders).toContain("staffCancelCounterPickup");
    expect(ops).not.toContain("CounterPickupCashierPanel");
    expect(ops).not.toContain("listUnpaidCounterPickup");
    expect(ops).not.toContain("staffSettleCounterPickup");
    expect(ops).toContain("REGISTER-OPERATIONS-RESPONSIBILITY-CLEANUP-1");
  });
});
