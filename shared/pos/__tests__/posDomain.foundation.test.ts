/**
 * POS-DOMAIN-ARCHITECTURE-IMPLEMENTATION-1 — shared domain contracts.
 */
import { describe, expect, it } from "vitest";
import {
  POS_PERMISSIONS,
  POS_TERMINAL_LIFECYCLES,
  deriveEffectivePosEntitlement,
  isPosPermission,
  isProvisionedLifecycle,
  nextPosTerminalCode,
} from "../index";

describe("POS domain foundation", () => {
  it("keeps terminal identity separate from cashier permissions", () => {
    expect(POS_TERMINAL_LIFECYCLES).toEqual([
      "registered",
      "active",
      "deactivated",
      "replaced",
    ]);
    expect(POS_PERMISSIONS).toContain("POS_ACCESS");
    expect(POS_PERMISSIONS).toContain("SALE_CREATE");
    expect(isPosPermission("POS_ACCESS")).toBe(true);
    expect(isPosPermission("owner")).toBe(false);
  });

  it("counts only registered and active terminals as provisioned", () => {
    expect(isProvisionedLifecycle("registered")).toBe(true);
    expect(isProvisionedLifecycle("active")).toBe(true);
    expect(isProvisionedLifecycle("deactivated")).toBe(false);
    expect(isProvisionedLifecycle("replaced")).toBe(false);
  });

  it("allocates stable POS-NNN codes without using hardware ids", () => {
    expect(nextPosTerminalCode([])).toBe("POS-001");
    expect(nextPosTerminalCode(["POS-001", "POS-003"])).toBe("POS-004");
  });

  it("derives remaining slots from Live Plan quantity, not devices", () => {
    expect(
      deriveEffectivePosEntitlement({
        included: 0,
        provisioned: 0,
        source: "missing_fail_closed",
      })
    ).toMatchObject({
      available: false,
      provisioningAllowed: false,
      remaining: 0,
    });
    expect(
      deriveEffectivePosEntitlement({
        included: 1,
        provisioned: 1,
        source: "live_plan_limit",
      }).provisioningAllowed
    ).toBe(false);
    expect(
      deriveEffectivePosEntitlement({
        included: null,
        provisioned: 9,
        source: "owner_unlimited",
      }).provisioningAllowed
    ).toBe(true);
  });
});
