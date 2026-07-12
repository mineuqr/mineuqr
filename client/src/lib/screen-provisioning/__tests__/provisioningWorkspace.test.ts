import { describe, expect, it, beforeEach, vi } from "vitest";

const sessionMemory: Record<string, string> = {};
vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => sessionMemory[key] ?? null,
  setItem: (key: string, value: string) => {
    sessionMemory[key] = value;
  },
  removeItem: (key: string) => {
    delete sessionMemory[key];
  },
  clear: () => {
    for (const key of Object.keys(sessionMemory)) delete sessionMemory[key];
  },
});
import {
  deviceSnapshotFromFleet,
  projectProvisioningFromSnapshot,
} from "../provisioningStateProjector";
import type { ProvisioningSession } from "../provisioningSessionContract";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";

function baseSession(overrides: Partial<ProvisioningSession> = {}): ProvisioningSession {
  const now = new Date().toISOString();
  return {
    sessionId: "prov_test",
    screenId: "device-1",
    deviceId: "device-1",
    tokenId: "token-1",
    restaurantId: 1,
    displayName: "Kitchen",
    role: "kitchen_display",
    status: "credentials_ready",
    pairingState: "pairing",
    activationState: "pending",
    startedAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    credentials: {
      deviceId: "device-1",
      tokenId: "token-1",
      recoveryQrSvg: "<svg></svg>",
    },
    warnings: [],
    errors: [],
    rotationCount: 0,
    retryCount: 0,
    mode: "create",
    ...overrides,
  };
}

const fleetOperational: FleetScreenReadModel = {
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

describe("provisioningStateProjector", () => {
  it("waiting for pairing when credentials exist but device never seen", () => {
    const session = baseSession();
    const projected = projectProvisioningFromSnapshot(session, {
      hasActiveToken: true,
      presence: "never_seen",
      operationalState: "initializing",
      businessReadiness: "unknown",
      deviceStatus: "active",
    });
    expect(projected.status).toBe("waiting_for_pairing");
    expect(projected.pairingState).toBe("pairing");
  });

  it("operational when fleet reports operational", () => {
    const session = baseSession();
    const snapshot = deviceSnapshotFromFleet(fleetOperational);
    const projected = projectProvisioningFromSnapshot(session, snapshot);
    expect(projected.status).toBe("operational");
    expect(projected.activationState).toBe("operational");
    expect(projected.pairingState).toBe("paired");
  });

  it("expired when past expiresAt", () => {
    const session = baseSession({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const projected = projectProvisioningFromSnapshot(session, null);
    expect(projected.status).toBe("expired");
  });
});

describe("ProvisioningSessionManager", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("creates and persists session", async () => {
    const { provisioningSessionManager } = await import("../ProvisioningSessionManager");
    const session = provisioningSessionManager.createSession({
      restaurantId: 1,
      displayName: "Test",
      role: "kitchen_display",
      deviceId: "d1",
      credentials: {
        deviceId: "d1",
        tokenId: "t1",
        recoveryQrSvg: "<svg></svg>",
      },
    });
    expect(session.status).toBe("credentials_ready");
    const loaded = provisioningSessionManager.loadSession(session.sessionId);
    expect(loaded?.deviceId).toBe("d1");
  });
});
