/**
 * POS-REGISTER-SHIFT-IMPLEMENTATION-1 — POS consumes canonical CRMP context.
 */
import { describe, expect, it, vi } from "vitest";
import {
  PosRegisterShiftContextError,
  PosRegisterShiftContextService,
  requireCanonicalRegisterShift,
} from "../services/PosRegisterShiftContextService";
import type { SettlementContext } from "@shared/crmp";

const RESTAURANT_A = 1;
const RESTAURANT_B = 2;

function context(overrides?: Partial<SettlementContext>): SettlementContext {
  return {
    restaurantId: RESTAURANT_A,
    registerId: "reg_1_front",
    financialShiftId: "fs_1_open",
    operatorUserId: 7,
    deviceId: "dev-1",
    operationalScreenId: null,
    resolvedAt: "2026-08-16T00:00:00.000Z",
    status: "resolved",
    gaps: [],
    ...overrides,
  };
}

describe("POS Register/Shift context mapping", () => {
  it("returns canonical CRMP ids when context is resolved", () => {
    const resolved = requireCanonicalRegisterShift(context(), RESTAURANT_A);
    expect(resolved).toMatchObject({
      restaurantId: RESTAURANT_A,
      registerId: "reg_1_front",
      financialShiftId: "fs_1_open",
      operatorUserId: 7,
      deviceId: "dev-1",
      status: "resolved",
    });
  });

  it("rejects missing Register, closed Register, and missing Shift", () => {
    expect(() =>
      requireCanonicalRegisterShift(
        context({
          registerId: null,
          financialShiftId: null,
          status: "unavailable",
          gaps: ["no_operational_hints"],
        }),
        RESTAURANT_A
      )
    ).toThrow(PosRegisterShiftContextError);

    expect(() =>
      requireCanonicalRegisterShift(
        context({
          financialShiftId: null,
          status: "partial",
          gaps: ["register_duty_closed"],
        }),
        RESTAURANT_A
      )
    ).toThrow(expect.objectContaining({ code: "register_closed" }));

    expect(() =>
      requireCanonicalRegisterShift(
        context({
          financialShiftId: null,
          status: "partial",
          gaps: ["no_active_shift"],
        }),
        RESTAURANT_A
      )
    ).toThrow(expect.objectContaining({ code: "shift_required" }));
  });

  it("rejects a Register from another restaurant", () => {
    try {
      requireCanonicalRegisterShift(
        context({ restaurantId: RESTAURANT_B }),
        RESTAURANT_A
      );
      throw new Error("expected rejection");
    } catch (err) {
      expect(err).toMatchObject({ code: "register_wrong_restaurant" });
    }
  });

  it("derives deviceId from the POS Terminal and does not accept client registerId", async () => {
    const resolve = vi.fn(async (input: { deviceId?: string | null }) =>
      context({ deviceId: input.deviceId ?? null })
    );
    const service = new PosRegisterShiftContextService(resolve, async () => "dev-from-terminal");
    const result = await service.requireForSettlement({
      restaurantId: RESTAURANT_A,
      terminalId: "11111111-1111-4111-8111-111111111111",
      operatorUserId: 7,
    });
    expect(resolve).toHaveBeenCalledWith({
      restaurantId: RESTAURANT_A,
      operatorUserId: 7,
      deviceId: "dev-from-terminal",
    });
    expect(result.deviceId).toBe("dev-from-terminal");
    expect(resolve.mock.calls[0][0]).not.toHaveProperty("registerId");
    expect(resolve.mock.calls[0][0]).not.toHaveProperty("shiftId");
  });
});
