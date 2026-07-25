/**
 * SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1 — Phase 4 architecture guards.
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

  it("cashier UI lives in Register Ops and reuses MarkPaidSettlementDialog", () => {
    const panel = read(
      "client/src/components/register-operations/CounterPickupCashierPanel.tsx"
    );
    const ops = read(
      "client/src/components/register-operations/RegisterOperationsPanel.tsx"
    );
    expect(panel).toContain("MarkPaidSettlementDialog");
    expect(panel).toContain("staffSettleCounterPickup");
    expect(panel).toContain("staffCancelCounterPickup");
    expect(ops).toContain("CounterPickupCashierPanel");
    expect(ops).toContain("SELF-ORDERING-COUNTER-PICKUP-ADOPTION-1");
  });
});
