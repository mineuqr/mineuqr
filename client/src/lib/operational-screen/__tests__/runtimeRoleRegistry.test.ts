import { describe, expect, it, beforeEach } from "vitest";
import { OPERATIONAL_DEVICE_ROLES } from "../../../../../server/operational-device/domain/deviceRoles";
import {
  clearRuntimeRoleRegistryForTests,
  isRoleOperational,
  registerRuntimeRole,
  resolveRuntimeRole,
  supportedRuntimeRoles,
} from "../roles/runtimeRoleRegistry";
import {
  customerDisplayRole,
  expoDisplayRole,
  kitchenDisplayRole,
  pickupDisplayRole,
  printMonitorRole,
  selfOrderingKioskRole,
  waiterDisplayRole,
} from "../roles/roleDefinitions";
import { mapBootstrapPhaseToRoleRuntimeStatus } from "../roles/runtimeRoleState";
import { isBlockedRole } from "../runtimeCapabilities";

function registerAllRoles() {
  registerRuntimeRole(kitchenDisplayRole);
  registerRuntimeRole(expoDisplayRole);
  registerRuntimeRole(pickupDisplayRole);
  registerRuntimeRole(customerDisplayRole);
  registerRuntimeRole(printMonitorRole);
  registerRuntimeRole(selfOrderingKioskRole);
  registerRuntimeRole(waiterDisplayRole);
}

describe("ROLE-RUNTIME-1 role registry", () => {
  beforeEach(() => {
    clearRuntimeRoleRegistryForTests();
    registerAllRoles();
  });

  it("registers all operational device roles", () => {
    expect(supportedRuntimeRoles().sort()).toEqual([...OPERATIONAL_DEVICE_ROLES].sort());
  });

  it("resolves role definitions without switch statements", () => {
    for (const role of OPERATIONAL_DEVICE_ROLES) {
      expect(resolveRuntimeRole(role).metadata.role).toBe(role);
    }
  });

  it("kitchen, expo, kiosk, and waiter are operational", () => {
    expect(isRoleOperational("kitchen_display")).toBe(true);
    expect(isRoleOperational("expo_display")).toBe(true);
    expect(isRoleOperational("self_ordering_kiosk")).toBe(true);
    expect(isRoleOperational("waiter_display")).toBe(true);
    expect(isBlockedRole("kitchen_display")).toBe(false);
    expect(isBlockedRole("expo_display")).toBe(false);
    expect(isBlockedRole("self_ordering_kiosk")).toBe(false);
    expect(isBlockedRole("waiter_display")).toBe(false);
  });

  it("pickup, customer, and print are blocked", () => {
    for (const role of [
      "pickup_display",
      "customer_display",
      "print_monitor",
    ] as const) {
      expect(isRoleOperational(role)).toBe(false);
      expect(isBlockedRole(role)).toBe(true);
      expect(resolveRuntimeRole(role).metadata.blockedReason).toBeDefined();
    }
  });

  it("capabilities are declared per role, not hardcoded in UI", () => {
    expect(resolveRuntimeRole("kitchen_display").metadata.capabilities.supportsCategoryFilter).toBe(
      true
    );
    expect(resolveRuntimeRole("pickup_display").metadata.capabilities.supportsQueue).toBe(true);
    expect(resolveRuntimeRole("customer_display").metadata.capabilities.supportsTimeline).toBe(true);
    expect(resolveRuntimeRole("print_monitor").metadata.capabilities.supportsPrintMonitor).toBe(true);
    expect(
      resolveRuntimeRole("self_ordering_kiosk").metadata.capabilities.supportsKioskOrdering
    ).toBe(true);
    expect(resolveRuntimeRole("self_ordering_kiosk").presentationKey).toBe("kiosk");
    expect(
      resolveRuntimeRole("waiter_display").metadata.capabilities.supportsWaiterOrdering
    ).toBe(true);
    expect(resolveRuntimeRole("waiter_display").presentationKey).toBe("waiter");
  });

  it("maps bootstrap phases to formal runtime states", () => {
    expect(mapBootstrapPhaseToRoleRuntimeStatus("loading", true)).toBe("initializing");
    expect(mapBootstrapPhaseToRoleRuntimeStatus("validating", true)).toBe("authenticating");
    expect(mapBootstrapPhaseToRoleRuntimeStatus("running", true)).toBe("operational");
    expect(mapBootstrapPhaseToRoleRuntimeStatus("blocked", false)).toBe("blocked");
    expect(mapBootstrapPhaseToRoleRuntimeStatus("degraded", true)).toBe("disconnected");
  });
});
