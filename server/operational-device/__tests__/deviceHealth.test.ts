import { describe, expect, it } from "vitest";
import { deriveDevicePresence, summarizeDeviceHealth } from "../domain/deviceHealth";
import { DEVICE_OFFLINE_THRESHOLD_MS } from "../domain/deviceRoles";

describe("deviceHealth", () => {
  it("marks device online within offline threshold", () => {
    const now = Date.now();
    const lastSeen = new Date(now - DEVICE_OFFLINE_THRESHOLD_MS + 1_000).toISOString();
    expect(deriveDevicePresence(lastSeen, now)).toBe("online");
  });

  it("marks device offline after threshold", () => {
    const now = Date.now();
    const lastSeen = new Date(now - DEVICE_OFFLINE_THRESHOLD_MS - 1).toISOString();
    expect(deriveDevicePresence(lastSeen, now)).toBe("offline");
  });

  it("summarizes operational health", () => {
    const now = Date.now();
    const health = summarizeDeviceHealth({
      status: "active",
      lastSeenAt: new Date(now - 5_000).toISOString(),
      reportedVersion: "1.0.0",
      hasActiveToken: true,
      now,
    });
    expect(health.operational).toBe(true);
    expect(health.presence).toBe("online");
  });
});
