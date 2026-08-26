/**
 * REGISTER-OPERATIONS-SHIFT-ROTATION-STATE-FIX-1
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  decideRegisterDutyCloseWithoutShift,
  isAuthoritativeCurrentShift,
  markRegisterShiftClosed,
  markRegisterShiftOpened,
  readCurrentShiftSnapshot,
  reconcileIncomingCurrentShift,
  resetRegisterShiftRotationMarksForTests,
  type CurrentShiftSnapshot,
} from "../financialShiftCurrentReconciliation";

function shift(
  overrides: Partial<CurrentShiftSnapshot> & Pick<CurrentShiftSnapshot, "financialShiftId" | "status">
): CurrentShiftSnapshot {
  return {
    registerId: "reg_1",
    restaurantId: 42,
    version: 1,
    openedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("financialShiftCurrentReconciliation", () => {
  beforeEach(() => {
    resetRegisterShiftRotationMarksForTests();
  });

  it("A. closed shift is not current", () => {
    expect(
      isAuthoritativeCurrentShift(shift({ financialShiftId: "A", status: "closed" }))
    ).toBe(false);
    expect(
      isAuthoritativeCurrentShift(shift({ financialShiftId: "B", status: "open" }))
    ).toBe(true);
  });

  it("B. open result wins over null cache", () => {
    const b = shift({ financialShiftId: "B", status: "open", version: 1 });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: null,
        incoming: b,
      })
    ).toEqual(b);
  });

  it("C. stale in-flight null cannot overwrite B", () => {
    const b = shift({ financialShiftId: "B", status: "open", openedAt: "t2" });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: b,
        incoming: null,
      })
    ).toEqual(b);
  });

  it("D/E. stale open A cannot overwrite newer B", () => {
    const a = shift({
      financialShiftId: "A",
      status: "open",
      openedAt: "2026-01-01T10:00:00.000Z",
    });
    const b = shift({
      financialShiftId: "B",
      status: "open",
      openedAt: "2026-01-01T12:00:00.000Z",
      version: 1,
    });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: b,
        incoming: a,
      })
    ).toEqual(b);
  });

  it("G. marked-closed A does not return as current", () => {
    markRegisterShiftClosed(42, "reg_1", "A");
    const incomingA = shift({ financialShiftId: "A", status: "open" });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: null,
        incoming: incomingA,
      })
    ).toBeNull();
    markRegisterShiftOpened(42, "reg_1");
  });

  it("A. close A then current is null", () => {
    markRegisterShiftClosed(42, "reg_1", "A");
    const a = shift({ financialShiftId: "A", status: "open" });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: a,
        incoming: null,
      })
    ).toBeNull();
  });

  it("F. refresh after B still returns B", () => {
    const b = shift({ financialShiftId: "B", status: "open", version: 2 });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: b,
        incoming: b,
      })
    ).toEqual(b);
  });

  it("E. polling snapshot of A cannot resurrect over B", () => {
    const b = shift({
      financialShiftId: "B",
      status: "open",
      openedAt: "2026-01-01T12:00:00.000Z",
      version: 1,
    });
    const a = shift({
      financialShiftId: "A",
      status: "open",
      openedAt: "2026-01-01T10:00:00.000Z",
      version: 3,
    });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: b,
        incoming: a,
      })
    ).toEqual(b);
  });

  it("M. same shift keeps the higher version", () => {
    const older = shift({ financialShiftId: "B", status: "open", version: 1 });
    const newer = shift({ financialShiftId: "B", status: "open", version: 4 });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: newer,
        incoming: older,
      })
    ).toEqual(newer);
  });

  it("G/H. close-without-shift uses authoritative current", () => {
    const b = shift({ financialShiftId: "B", status: "open" });
    expect(decideRegisterDutyCloseWithoutShift(b).action).toBe("block");
    expect(decideRegisterDutyCloseWithoutShift(null).action).toBe("close_duty");
    expect(
      decideRegisterDutyCloseWithoutShift(
        shift({ financialShiftId: "A", status: "closed" })
      ).action
    ).toBe("close_duty");
  });

  it("N. cross-restaurant incoming is ignored", () => {
    const b = shift({ financialShiftId: "B", status: "open", restaurantId: 99 });
    const cached = shift({ financialShiftId: "B", status: "open" });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached,
        incoming: b,
      })
    ).toEqual(cached);
  });

  it("L. register identity mismatch is ignored", () => {
    const other = shift({
      financialShiftId: "X",
      status: "open",
      registerId: "reg_other",
    });
    expect(
      reconcileIncomingCurrentShift({
        restaurantId: 42,
        registerId: "reg_1",
        cached: null,
        incoming: other,
      })
    ).toBeNull();
  });

  it("reads a current-shift snapshot without inventing fields", () => {
    const b = shift({ financialShiftId: "B", status: "open" });
    expect(readCurrentShiftSnapshot(b)).toEqual(b);
    expect(readCurrentShiftSnapshot(null)).toBeNull();
    expect(readCurrentShiftSnapshot({})).toBeNull();
  });
});
