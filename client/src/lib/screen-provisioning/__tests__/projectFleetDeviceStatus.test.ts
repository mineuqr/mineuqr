import { describe, expect, it } from "vitest";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import { projectFleetDeviceStatus } from "../projectFleetDeviceStatus";

const operationalScreen: FleetScreenReadModel = {
  screenId: "device-1",
  displayName: "Kitchen",
  role: "kitchen_display",
  branchId: null,
  zoneId: null,
  canonicalState: {
    operationalState: "operational",
    connectivityState: "connected",
    businessReadiness: "ready",
    maintenanceState: "normal",
  },
  businessReadiness: "ready",
  healthSummary: {
    presence: "online",
    operational: true,
    hasActiveToken: true,
    warningCount: 0,
  },
  lastHeartbeat: new Date().toISOString(),
  reportedVersion: "1.0",
  configurationVersion: "v1",
  tenantId: 1,
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

describe("projectFleetDeviceStatus", () => {
  it("projects operational status from fleet read model without credentials", () => {
    const health = projectFleetDeviceStatus(operationalScreen);
    expect(health.status).toBe("operational");
    expect(health.pairingState).toBe("paired");
    expect(health.activationState).toBe("operational");
    expect(health.expired).toBe(false);
  });

  it("reports revoked pairing when active token is missing", () => {
    const health = projectFleetDeviceStatus({
      ...operationalScreen,
      healthSummary: {
        ...operationalScreen.healthSummary,
        hasActiveToken: false,
      },
    });
    expect(health.status).toBe("failed");
    expect(health.pairingState).toBe("revoked");
    expect(health.errorCount).toBe(1);
  });
});
