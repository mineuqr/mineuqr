/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID,
  canCloseSession,
  canCompleteOrder,
} from "../check/lifecycleSettlementGuards";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("LIFECYCLE-SETTLEMENT-GUARDS-1 architecture guards", () => {
  it("registers program id and financial completion rule", () => {
    expect(LIFECYCLE_SETTLEMENT_GUARDS_PROGRAM_ID).toBe(
      "LIFECYCLE-SETTLEMENT-GUARDS-1"
    );
    expect(canCloseSession("paid")).toBe(true);
    expect(canCloseSession("open")).toBe(false);
    expect(
      canCompleteOrder({ requiresSettlement: true, checkOutcome: "open" })
    ).toBe(false);
    expect(
      canCompleteOrder({ requiresSettlement: false, checkOutcome: "open" })
    ).toBe(true);
  });

  it("Session close and Order served consume shared guard service", () => {
    const sessionSvc = read("server/diningSession/sessionService.ts");
    const advance = read(
      "server/order/application/AdvanceOrderStatusService.ts"
    );
    const guardSvc = read(
      "server/operational-session/check/lifecycleSettlementGuardService.ts"
    );
    expect(sessionSvc).toContain("LIFECYCLE-SETTLEMENT-GUARDS-1");
    expect(sessionSvc).toContain("assertSessionCloseable");
    expect(sessionSvc).not.toContain("voidCheckByIdDetailed");
    expect(advance).toContain("LIFECYCLE-SETTLEMENT-GUARDS-1");
    expect(advance).toContain("assertOrderCompletable");
    expect(advance).toContain('targetStatus === "served"');
    expect(guardSvc).toContain("findProductionCollectionFactByOrderId");
    expect(guardSvc).not.toContain("findBlockingMembershipForOrder");
  });

  it("does not redesign Settlement / Reporting / Register / Shift", () => {
    const guardSvc = read(
      "server/operational-session/check/lifecycleSettlementGuardService.ts"
    );
    const pure = read(
      "shared/operational-session/check/lifecycleSettlementGuards.ts"
    );
    expect(guardSvc).not.toContain("settleCheckPaid");
    expect(guardSvc).not.toContain("SettlementRecord");
    expect(guardSvc).not.toContain("financialShift");
    expect(pure).not.toContain("getDb");
    expect(pure).toContain("Never auto-settle");
  });

  it("API error mapping exposes explicit settlement guard messages", () => {
    const sessionMap = read("server/diningSession/mapSessionErrorToTrpc.ts");
    const orderMap = read("server/order/application/mapOrderDomainError.ts");
    expect(sessionMap).toContain("LifecycleSettlementGuardError");
    expect(orderMap).toContain("LifecycleSettlementGuardError");
  });

  it("Orders UI hides serve for unpaid sessionless (consistent with API)", () => {
    const actions = read(
      "client/src/lib/operational-workspace/operationalActions.ts"
    );
    expect(actions).toContain("LIFECYCLE-SETTLEMENT-GUARDS-1");
    expect(actions).toContain('a.id !== "serve-order"');
  });
});
