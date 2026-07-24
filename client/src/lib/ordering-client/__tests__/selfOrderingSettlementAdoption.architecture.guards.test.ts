/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — architecture guards.
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

  it("exposes order.settlePaid public procedure", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("settleOrderPaid");
    expect(routers).toContain("settlePaid: publicProcedure");
    expect(routers).toContain("getSettlementReceipt: publicProcedure");
  });

  it("kiosk checkout runs Place Order then Register Payment", () => {
    const stage = read("client/src/pages/kiosk/KioskCheckoutStage.tsx");
    expect(stage).toContain("deferTrackingNavigation: true");
    expect(stage).toContain("order.settlePaid");
    expect(stage).toContain('settlementRecordUiLabel("registerPayment"');
    expect(stage).toContain('settlementRecordUiLabel("outstanding"');
    expect(stage).toContain("getSettlementReceipt");
    expect(stage).not.toContain("allocation");
    expect(stage).not.toContain("multiCheck");
  });

  it("does not introduce a second Settlement Record writer on order path", () => {
    const svc = read("server/order/application/SettleOrderPaidService.ts");
    expect(svc).toContain("SELF-ORDERING-SETTLEMENT-ADOPTION-1");
    expect(svc).toMatch(/certified Check settle pipeline|settleCheckPaidByIdDetailed/);
  });
});
