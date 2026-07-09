import { describe, expect, it } from "vitest";
import {
  resolvePrimaryDeviceOrderAction,
  rolePermitsOrderAction,
  rolePermitsOrderExecution,
  validateDeviceOrderAction,
} from "../domain/deviceOrderExecution";

describe("deviceOrderExecution", () => {
  it("permits kitchen production actions only", () => {
    expect(rolePermitsOrderExecution("kitchen_display")).toBe(true);
    expect(rolePermitsOrderAction("kitchen_display", "accept-order")).toBe(true);
    expect(rolePermitsOrderAction("kitchen_display", "mark-ready")).toBe(true);
    expect(rolePermitsOrderAction("kitchen_display", "serve-order")).toBe(false);
  });

  it("permits expo handoff actions", () => {
    expect(rolePermitsOrderAction("expo_display", "mark-ready")).toBe(true);
    expect(rolePermitsOrderAction("expo_display", "serve-order")).toBe(true);
    expect(rolePermitsOrderAction("expo_display", "accept-order")).toBe(false);
  });

  it("permits pickup serve only", () => {
    expect(rolePermitsOrderAction("pickup_display", "serve-order")).toBe(true);
    expect(rolePermitsOrderAction("pickup_display", "mark-ready")).toBe(false);
  });

  it("blocks non-operational roles", () => {
    expect(rolePermitsOrderExecution("print_monitor")).toBe(false);
    expect(rolePermitsOrderExecution("customer_display")).toBe(false);
  });

  it("resolves primary action from role and status", () => {
    expect(resolvePrimaryDeviceOrderAction("kitchen_display", "pending")).toBe("accept-order");
    expect(resolvePrimaryDeviceOrderAction("kitchen_display", "preparing")).toBe("mark-ready");
    expect(resolvePrimaryDeviceOrderAction("expo_display", "ready")).toBe("serve-order");
    expect(resolvePrimaryDeviceOrderAction("kitchen_display", "ready")).toBeNull();
  });

  it("validates action against role and status", () => {
    expect(validateDeviceOrderAction("kitchen_display", "accept-order", "pending")).toEqual({
      ok: true,
    });
    expect(validateDeviceOrderAction("kitchen_display", "serve-order", "ready")).toEqual({
      ok: false,
      code: "role_forbidden",
    });
    expect(validateDeviceOrderAction("kitchen_display", "mark-ready", "pending")).toEqual({
      ok: false,
      code: "status_mismatch",
    });
  });
});
