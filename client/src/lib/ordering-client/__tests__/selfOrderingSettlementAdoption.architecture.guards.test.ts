/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — backend façade preserved.
 * SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1 Phase 2 — kiosk UI must not invoke it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SELF-ORDERING-SETTLEMENT-ADOPTION-1 architecture guards", () => {
  it("settle façade reuses settleCheckPaidByIdDetailed only", () => {
    const svc = read("server/order/application/SettleOrderPaidService.ts");
    expect(svc).toContain("settleCheckPaidByIdDetailed");
    expect(svc).toContain("findBlockingMembershipForOrder");
    expect(svc).not.toContain("insertSettlementRecord");
    expect(svc).not.toContain("createSettlementRecord(");
    expect(svc).not.toContain("finalizeOpenCheckById");
  });

  it("exposes order.settlePaid public procedure (cashier reuse — not removed)", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("settleOrderPaid");
    expect(routers).toContain("settlePaid: publicProcedure");
    expect(routers).toContain("getSettlementReceipt: publicProcedure");
  });

  it("kiosk checkout never invokes customer settlement (counter-pickup Phase 2)", () => {
    const stage = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(stage).toContain("SELF-ORDERING-COUNTER-PICKUP-ARCHITECTURE-1");
    expect(stage).toContain("buildKioskStationCheckoutIdentity");
    expect(stage).toContain("checkout.submit");
    expect(stage).not.toMatch(/deferTrackingNavigation\s*:/);
    expect(stage).not.toContain("order.settlePaid");
    expect(stage).not.toContain("getSettlementReceipt");
    expect(stage).not.toContain("settlementRecordUiLabel");
    expect(stage).not.toContain("listMonetaryPaymentMethodOptions");
    expect(stage).not.toContain("singleTenderSettlements");
    expect(stage).not.toContain('step === "payment"');
    expect(stage).not.toContain('step === "success"');
    expect(stage).not.toContain("Register Payment");
    expect(stage).not.toContain("allocation");
    expect(stage).not.toContain("multiCheck");
  });

  it("does not introduce a second Settlement Record writer on order path", () => {
    const svc = read("server/order/application/SettleOrderPaidService.ts");
    expect(svc).toContain("SELF-ORDERING-SETTLEMENT-ADOPTION-1");
    expect(svc).toMatch(/certified Check settle pipeline|settleCheckPaidByIdDetailed/);
  });
});
