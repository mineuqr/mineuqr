import { describe, expect, it } from "vitest";
import {
  allowsAutomaticRotateOnMount,
  requiresRotateConfirmation,
  resolveFleetProvisioningNavigation,
} from "../provisioningNavigation";

describe("BUGFIX-F003 provisioningNavigation", () => {
  const restaurantId = 42;
  const deviceId = "device-kitchen-1";

  it("Status navigates to status mode without session lookup", () => {
    const target = resolveFleetProvisioningNavigation({
      action: "status",
      restaurantId,
      deviceId,
      findSessionByDevice: () => null,
    });
    expect(target).toEqual({
      restaurantId,
      mode: "status",
      deviceId,
    });
    expect(target.mode).not.toBe("rotate");
  });

  it("Status never falls back to rotate when session is missing", () => {
    const target = resolveFleetProvisioningNavigation({
      action: "status",
      restaurantId,
      deviceId,
      findSessionByDevice: () => null,
    });
    expect(target.mode).toBe("status");
    expect(target.sessionId).toBeUndefined();
  });

  it("Resume uses existing local session when present", () => {
    const target = resolveFleetProvisioningNavigation({
      action: "resume",
      restaurantId,
      deviceId,
      findSessionByDevice: () => ({ sessionId: "prov_local_1" }),
    });
    expect(target).toEqual({
      restaurantId,
      mode: "resume",
      sessionId: "prov_local_1",
    });
    expect(target.mode).not.toBe("rotate");
  });

  it("Resume without local session never rotates credentials", () => {
    const target = resolveFleetProvisioningNavigation({
      action: "resume",
      restaurantId,
      deviceId,
      findSessionByDevice: () => null,
    });
    expect(target).toEqual({
      restaurantId,
      mode: "resume",
      deviceId,
    });
    expect(target.mode).not.toBe("rotate");
  });

  it("Rotate is explicit and includes deviceId only", () => {
    const target = resolveFleetProvisioningNavigation({
      action: "rotate",
      restaurantId,
      deviceId,
      findSessionByDevice: () => null,
    });
    expect(target).toEqual({
      restaurantId,
      mode: "rotate",
      deviceId,
    });
  });

  it("requiresRotateConfirmation is true for rotate URL handoff", () => {
    expect(
      requiresRotateConfirmation({
        sessionId: null,
        mode: "rotate",
        deviceId,
      })
    ).toBe(true);
  });

  it("requiresRotateConfirmation is false for status mode", () => {
    expect(
      requiresRotateConfirmation({
        sessionId: null,
        mode: "status",
        deviceId,
      })
    ).toBe(false);
  });

  it("automatic rotate on mount is permanently disabled", () => {
    expect(allowsAutomaticRotateOnMount()).toBe(false);
  });
});
