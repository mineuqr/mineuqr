import { describe, expect, it } from "vitest";
import { classifyCashierRegisterGap } from "../cashierRegisterGap";

describe("cashier register gap classification", () => {
  it("maps existing Register/Shift messages without inventing a new code", () => {
    expect(
      classifyCashierRegisterGap(new Error("An open Financial Shift is required"))
    ).toBe("shift_required");
    expect(
      classifyCashierRegisterGap(new Error("An open Register is required"))
    ).toBe("register_required");
    expect(classifyCashierRegisterGap(new Error("Register is not open"))).toBe(
      "register_closed"
    );
    expect(classifyCashierRegisterGap(new Error("Order not found"))).toBeNull();
  });
});
