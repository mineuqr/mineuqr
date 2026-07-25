import { describe, expect, it } from "vitest";
import {
  resolveSettlementContextFromFacts,
  unavailableSettlementContext,
} from "../index";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "../register/registerCommands";
import { openFinancialShift } from "../financialShift/financialShiftCommands";

function reg(deviceId: string | null = null) {
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
  const base = openRegister({
    register: catalog,
    at: "t1b",
    operatorUserId: 10,
  });
  return deviceId ? { ...base, deviceId } : base;
}

function shift(registerId = "reg_1", operatorUserId = 10) {
  return openFinancialShift({
    financialShiftId: "fsh_1",
    drawerId: "drw_1",
    openingMovementId: "mov_1",
    register: reg(),
    hasActiveShiftOnRegister: false,
    restaurantId: 1,
    operatorUserId,
    openingFloatAmount: "0",
    currencyCode: "SAR",
    openedAt: "t2",
    shiftNumber: 1,
  });
}

describe("SETTLEMENT-CONTEXT-ADOPTION-1 resolveSettlementContextFromFacts", () => {
  it("resolves fully from registerId + active shift", () => {
    const s = shift();
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { registerId: "reg_1", operatorUserId: 10 },
      registers: [reg()],
      activeShiftOnRegister: s,
      activeShiftsForOperator: [],
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.registerId).toBe("reg_1");
    expect(ctx.financialShiftId).toBe("fsh_1");
    expect(ctx.operatorUserId).toBe(10);
    expect(ctx.gaps).toEqual([]);
  });

  it("resolves register from deviceId", () => {
    const s = shift();
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { deviceId: "dev_1", operatorUserId: 10 },
      registers: [reg("dev_1")],
      activeShiftOnRegister: s,
      activeShiftsForOperator: [],
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.registerId).toBe("reg_1");
    expect(ctx.deviceId).toBe("dev_1");
  });

  it("resolves register from operator active shift", () => {
    const s = shift();
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { operatorUserId: 10 },
      registers: [reg()],
      activeShiftOnRegister: null,
      activeShiftsForOperator: [s],
    });
    expect(ctx.status).toBe("resolved");
    expect(ctx.financialShiftId).toBe("fsh_1");
  });

  it("does not fabricate when register missing", () => {
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { registerId: "reg_missing", operatorUserId: 10 },
      registers: [reg()],
      activeShiftOnRegister: null,
      activeShiftsForOperator: [],
    });
    expect(ctx.registerId).toBeNull();
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("register_not_found");
    expect(ctx.status).toBe("partial");
  });

  it("reports no_active_shift without inventing shift", () => {
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { registerId: "reg_1", operatorUserId: 10 },
      registers: [reg()],
      activeShiftOnRegister: null,
      activeShiftsForOperator: [],
    });
    expect(ctx.registerId).toBe("reg_1");
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.gaps).toContain("no_active_shift");
    expect(ctx.status).toBe("partial");
  });

  it("unavailable with no hints", () => {
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: {},
      registers: [reg()],
      activeShiftOnRegister: shift(),
      activeShiftsForOperator: [],
    });
    expect(ctx.status).toBe("unavailable");
    expect(ctx.gaps).toContain("no_operational_hints");
  });

  it("ambiguous device is a gap, not a guess", () => {
    const r1 = reg("dev_shared");
    const r2 = {
      ...activateRegister({
        register: provisionRegister({
          registerId: "reg_2",
          restaurantId: 1,
          code: "FRONT2",
          registerType: "counter",
          displayName: "B",
          createdAt: "t0",
        }),
        at: "t1",
      }),
      deviceId: "dev_shared",
    };
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { deviceId: "dev_shared" },
      registers: [r1, r2],
      activeShiftOnRegister: null,
      activeShiftsForOperator: [],
    });
    expect(ctx.registerId).toBeNull();
    expect(ctx.gaps).toContain("ambiguous_register_for_device");
  });

  it("unavailableSettlementContext helper", () => {
    const ctx = unavailableSettlementContext(9, "t", ["x"]);
    expect(ctx.status).toBe("unavailable");
    expect(ctx.restaurantId).toBe(9);
  });

  it("closed Duty cannot accept settlement context", () => {
    const closed = activateRegister({
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
    expect(closed.dutyStatus).toBe("closed");
    const ctx = resolveSettlementContextFromFacts({
      restaurantId: 1,
      resolvedAt: "t3",
      hints: { registerId: "reg_1", operatorUserId: 10 },
      registers: [closed],
      activeShiftOnRegister: null,
      activeShiftsForOperator: [],
    });
    expect(ctx.gaps).toContain("register_duty_closed");
    expect(ctx.financialShiftId).toBeNull();
    expect(ctx.status).not.toBe("resolved");
  });
});
