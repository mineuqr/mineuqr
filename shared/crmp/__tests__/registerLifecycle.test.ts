import { describe, expect, it } from "vitest";
import {
  activateRegister,
  deactivateRegister,
  provisionRegister,
} from "../register/registerCommands";
import {
  assertRegisterTransition,
  isRegisterTransitionAllowed,
} from "../register/registerLifecycle";
import { CrmpInvariantError } from "../crmpErrors";

describe("CRMP Register lifecycle", () => {
  it("provisions → activates → deactivates", () => {
    const r = provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      displayName: "Front",
      createdAt: "2026-07-24T06:00:00Z",
    });
    expect(r.status).toBe("provisioned");
    const active = activateRegister({ register: r, at: "2026-07-24T06:01:00Z" });
    expect(active.status).toBe("active");
    const inactive = deactivateRegister({
      register: active,
      hasActiveShift: false,
      at: "2026-07-24T22:00:00Z",
    });
    expect(inactive.status).toBe("inactive");
  });

  it("forbids deactivate while active shift (D-INV-05)", () => {
    const r = activateRegister({
      register: provisionRegister({
        registerId: "reg_1",
        restaurantId: 1,
        displayName: "Front",
        createdAt: "t0",
      }),
      at: "t1",
    });
    expect(() =>
      deactivateRegister({ register: r, hasActiveShift: true, at: "t2" })
    ).toThrow(CrmpInvariantError);
  });

  it("forbids provisioned → inactive", () => {
    expect(isRegisterTransitionAllowed("provisioned", "inactive")).toBe(false);
    expect(() => assertRegisterTransition("provisioned", "inactive")).toThrow();
  });
});
