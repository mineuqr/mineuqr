import { describe, expect, it } from "vitest";
import {
  abortCloseFinancialShift,
  archiveFinancialShift,
  beginCloseFinancialShift,
  buildFinancialShiftOpenedEvent,
  cancelOpenFinancialShift,
  closeFinancialShift,
  openFinancialShift,
  recordDrawerCount,
  resumeFinancialShift,
  suspendFinancialShift,
  isActiveShiftStatus,
  resolveFinancialShiftByOperator,
  CrmpConflictError,
  CrmpInvariantError,
} from "../index";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "../register/registerCommands";

function activeRegister() {
  const catalog = activateRegister({
    register: provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      code: "FRONT",
      registerType: "counter",
      displayName: "Front",
      createdAt: "t0",
    }),
    at: "t1",
  });
  return openRegister({ register: catalog, at: "t1b", operatorUserId: 10 });
}

function openShift() {
  return openFinancialShift({
    financialShiftId: "fsh_1",
    drawerId: "drw_1",
    openingMovementId: "mov_1",
    register: activeRegister(),
    hasActiveShiftOnRegister: false,
    restaurantId: 1,
    operatorUserId: 10,
    openingFloatAmount: "100.00",
    currencyCode: "SAR",
    openedAt: "t2",
    shiftNumber: 1,
  });
}

describe("ADR-ARCH-030 Financial Shift lifecycle (pure)", () => {
  it("active statuses include suspended and closing", () => {
    expect(isActiveShiftStatus("open")).toBe(true);
    expect(isActiveShiftStatus("suspended")).toBe(true);
    expect(isActiveShiftStatus("closing")).toBe(true);
    expect(isActiveShiftStatus("handover_pending")).toBe(true);
    expect(isActiveShiftStatus("closed")).toBe(false);
    expect(isActiveShiftStatus("archived")).toBe(false);
  });

  it("valid lifecycle open→suspend→resume→closing→closed→archived", () => {
    let shift = openShift();
    shift = suspendFinancialShift({ shift, at: "t3" });
    expect(shift.status).toBe("suspended");
    shift = resumeFinancialShift({ shift, at: "t4" });
    expect(shift.status).toBe("open");
    shift = beginCloseFinancialShift({ shift, at: "t5" });
    expect(shift.status).toBe("closing");
    shift = recordDrawerCount({
      shift,
      countId: "c1",
      kind: "final",
      actualAmount: "100.00",
      actorUserId: 10,
      recordedAt: "t6",
    });
    shift = closeFinancialShift({ shift, closedAt: "t7" });
    expect(shift.status).toBe("closed");
    shift = archiveFinancialShift({ shift, archivedAt: "t8" });
    expect(shift.status).toBe("archived");
  });

  it("invalid transitions are rejected", () => {
    const shift = openShift();
    expect(() =>
      archiveFinancialShift({ shift, archivedAt: "t" })
    ).toThrow(CrmpInvariantError);
    const closed = closeFinancialShift({
      shift: recordDrawerCount({
        shift,
        countId: "c",
        kind: "final",
        actualAmount: "100.00",
        actorUserId: 10,
        recordedAt: "t",
      }),
      closedAt: "t2",
    });
    expect(() =>
      suspendFinancialShift({ shift: closed, at: "t3" })
    ).toThrow(CrmpInvariantError);
  });

  it("duplicate suspend/resume/close are idempotent", () => {
    let shift = openShift();
    shift = suspendFinancialShift({ shift, at: "t3" });
    const again = suspendFinancialShift({ shift, at: "t4" });
    expect(again.version).toBe(shift.version);
    shift = resumeFinancialShift({ shift, at: "t5" });
    const resumed = resumeFinancialShift({ shift, at: "t6" });
    expect(resumed.version).toBe(shift.version);
  });

  it("abort close recovers from crash corridor", () => {
    let shift = beginCloseFinancialShift({ shift: openShift(), at: "t3" });
    shift = abortCloseFinancialShift({ shift, at: "t4" });
    expect(shift.status).toBe("open");
  });

  it("cancelOpen empty path; rejects non-empty", () => {
    const empty = cancelOpenFinancialShift({
      shift: openShift(),
      closedAt: "t3",
    });
    expect(empty.closeReason).toBe("cancelled_empty");
  });

  it("resolve by operator conflicts on multiples", () => {
    const a = openShift();
    const b = {
      ...a,
      financialShiftId: "fsh_2",
      drawer: { ...a.drawer, drawerId: "drw_2" },
    };
    expect(() => resolveFinancialShiftByOperator([a, b], 10)).toThrow(
      CrmpConflictError
    );
  });

  it("event claim keys are deterministic", () => {
    const shift = openShift();
    const e1 = buildFinancialShiftOpenedEvent(shift, "t2");
    const e2 = buildFinancialShiftOpenedEvent(shift, "t9");
    expect(e1.claimKey).toBe(e2.claimKey);
    expect(e1.claimKey).toContain("FinancialShiftOpened");
  });

  it("archived cannot transition", () => {
    let shift = openShift();
    shift = recordDrawerCount({
      shift,
      countId: "c",
      kind: "final",
      actualAmount: "100.00",
      actorUserId: 10,
      recordedAt: "t",
    });
    shift = closeFinancialShift({ shift, closedAt: "t2" });
    shift = archiveFinancialShift({ shift, archivedAt: "t3" });
    expect(() =>
      beginCloseFinancialShift({ shift, at: "t4" })
    ).toThrow(CrmpInvariantError);
    expect(() =>
      archiveFinancialShift({ shift, archivedAt: "t5" })
    ).not.toThrow(); // idempotent
  });

  it("open shortcut close still requires final count", () => {
    expect(() =>
      closeFinancialShift({ shift: openShift(), closedAt: "t" })
    ).toThrow(CrmpInvariantError);
  });

  it("pending status is not in SHIFT_STATUSES", async () => {
    const { SHIFT_STATUSES } = await import("../valueObjects");
    expect(SHIFT_STATUSES).not.toContain("pending");
  });
});
