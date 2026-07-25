import { describe, expect, it } from "vitest";
import {
  assertOrderCompleteAllowed,
  assertSessionCloseAllowed,
  canCloseSession,
  canCompleteOrder,
  isFinanciallyCompleteCheckOutcome,
  LifecycleSettlementGuardError,
  validateSettlementBeforeTerminalTransition,
} from "../lifecycleSettlementGuards";

describe("LIFECYCLE-SETTLEMENT-GUARDS-1 pure guards", () => {
  it("treats only paid and complimentary as financial completion", () => {
    expect(isFinanciallyCompleteCheckOutcome("paid")).toBe(true);
    expect(isFinanciallyCompleteCheckOutcome("complimentary")).toBe(true);
    expect(isFinanciallyCompleteCheckOutcome("open")).toBe(false);
    expect(isFinanciallyCompleteCheckOutcome("voided")).toBe(false);
    expect(isFinanciallyCompleteCheckOutcome(null)).toBe(false);
  });

  it("blocks session close when Check is unsettled", () => {
    expect(canCloseSession("open")).toBe(false);
    expect(() => assertSessionCloseAllowed("open")).toThrow(
      LifecycleSettlementGuardError
    );
    try {
      assertSessionCloseAllowed(null);
    } catch (e) {
      expect(e).toBeInstanceOf(LifecycleSettlementGuardError);
      expect((e as LifecycleSettlementGuardError).code).toBe(
        "SESSION_REQUIRES_SETTLEMENT"
      );
      expect((e as Error).message).toContain("Cannot close session before settlement");
    }
  });

  it("allows session close when paid or complimentary", () => {
    expect(canCloseSession("paid")).toBe(true);
    expect(canCloseSession("complimentary")).toBe(true);
    expect(() => assertSessionCloseAllowed("paid")).not.toThrow();
    expect(() => assertSessionCloseAllowed("complimentary")).not.toThrow();
  });

  it("blocks sessionless order complete when unpaid; allows after settlement", () => {
    expect(
      canCompleteOrder({ requiresSettlement: true, checkOutcome: "open" })
    ).toBe(false);
    expect(() =>
      assertOrderCompleteAllowed({
        requiresSettlement: true,
        checkOutcome: "open",
      })
    ).toThrow(/ORDER_REQUIRES_SETTLEMENT|Cannot complete order/);

    expect(
      canCompleteOrder({ requiresSettlement: true, checkOutcome: "paid" })
    ).toBe(true);
    expect(() =>
      assertOrderCompleteAllowed({
        requiresSettlement: true,
        checkOutcome: "complimentary",
      })
    ).not.toThrow();
  });

  it("allows Waiter / Table QR serve without settlement (no regression)", () => {
    expect(
      canCompleteOrder({ requiresSettlement: false, checkOutcome: "open" })
    ).toBe(true);
    expect(() =>
      assertOrderCompleteAllowed({
        requiresSettlement: false,
        checkOutcome: "open",
      })
    ).not.toThrow();
  });

  it("validateSettlementBeforeTerminalTransition covers both kinds", () => {
    expect(() =>
      validateSettlementBeforeTerminalTransition({
        kind: "session_close",
        checkOutcome: "paid",
      })
    ).not.toThrow();
    expect(() =>
      validateSettlementBeforeTerminalTransition({
        kind: "order_complete",
        checkOutcome: "open",
        requiresSettlement: true,
      })
    ).toThrow(LifecycleSettlementGuardError);
  });
});
