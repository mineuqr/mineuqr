/**
 * FINANCIAL-SHIFT-RETENTION-ADOPTION-1 — human shift number.
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { formatHumanShiftNumber, openFinancialShift } from "../index";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "../register/registerCommands";

describe("human shift number", () => {
  it("formats padded display number", () => {
    expect(formatHumanShiftNumber(1)).toBe("000001");
    expect(formatHumanShiftNumber(42)).toBe("000042");
  });

  it("persists immutable shiftNumber on open", () => {
    const register = openRegister({
      register: activateRegister({
        register: provisionRegister({
          registerId: "reg_1",
          restaurantId: 1,
          code: "FRONT",
          registerType: "counter",
          displayName: "Front",
          createdAt: "t0",
        }),
        at: "t1",
      }),
      at: "t1b",
      operatorUserId: 10,
    });
    const shift = openFinancialShift({
      financialShiftId: "fsh_1",
      drawerId: "drw_1",
      openingMovementId: "mov_1",
      register,
      hasActiveShiftOnRegister: false,
      restaurantId: 1,
      operatorUserId: 10,
      openingFloatAmount: "10.00",
      currencyCode: "SAR",
      openedAt: "t2",
      shiftNumber: 7,
    });
    expect(shift.shiftNumber).toBe(7);
  });
});
