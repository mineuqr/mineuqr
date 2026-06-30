import { describe, expect, it } from "vitest";
import {
  deriveOnboardingStep,
  deriveOperationalPrintStatus,
  deriveProvisioningWorkflowState,
  filterProductionPrinters,
  isSimulatedPrinterId,
  printerStateLabel,
} from "../operationalViewModels";

describe("operational view models", () => {
  it("detects simulated printer ids", () => {
    expect(isSimulatedPrinterId("linux-usb-sim-01")).toBe(true);
    expect(isSimulatedPrinterId("kitchen-receipt")).toBe(false);
  });

  it("filters simulated printers from discovery lists", () => {
    const filtered = filterProductionPrinters([
      { id: "linux-usb-sim-01", name: "Sim" },
      { id: "hp-laser", name: "HP" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe("hp-laser");
  });

  it("reports ready when connector, session, and printer are healthy", () => {
    const status = deriveOperationalPrintStatus({
      connector: {
        connectionStatus: "connected",
        healthLabel: "Healthy",
        connectorVersion: "1",
        runtimePlatform: "windows",
        runtimeUptimeMs: 1000,
        lastHeartbeatAt: null,
        connectorId: "rlc-1",
        hostLabel: "kitchen",
      },
      session: {
        sessionState: "connected",
        authentication: "Authenticated",
        registration: "Registered",
        transport: "Connector Session",
        connectedSince: null,
        lastActivityAt: null,
      },
      printer: {
        configured: true,
        isDefault: true,
        lastValidatedAt: null,
        printer: {
          id: 1,
          restaurantId: 1,
          printerId: "hp-1",
          displayName: "Kitchen",
          platform: "windows",
          transport: "usb",
          isDefault: true,
          isActive: true,
          lastValidatedAt: null,
          capabilities: null,
        },
        status: {
          printerId: "hp-1",
          isOnline: true,
          isReady: true,
          paperLow: false,
          paperOut: false,
          checkedAt: "2026-06-30T12:00:00.000Z",
        },
      },
    });

    expect(status.canPrint).toBe(true);
    expect(status.systemReady).toBe("ready");
  });

  it("blocks print when connector is offline with operator guidance", () => {
    const status = deriveOperationalPrintStatus({
      connector: {
        connectionStatus: "offline",
        healthLabel: "Offline",
        connectorVersion: null,
        runtimePlatform: null,
        runtimeUptimeMs: null,
        lastHeartbeatAt: null,
        connectorId: null,
        hostLabel: null,
      },
      session: undefined,
      printer: undefined,
    });

    expect(status.canPrint).toBe(false);
    expect(status.subline.en).toContain("MineuQR Connector");
  });

  it("treats simulated configured printer as not configured", () => {
    const state = deriveOperationalPrintStatus({
      connector: {
        connectionStatus: "connected",
        healthLabel: "Healthy",
        connectorVersion: null,
        runtimePlatform: null,
        runtimeUptimeMs: null,
        lastHeartbeatAt: null,
        connectorId: "rlc",
        hostLabel: null,
      },
      session: {
        sessionState: "connected",
        authentication: "Authenticated",
        registration: "Registered",
        transport: "Connector Session",
        connectedSince: null,
        lastActivityAt: null,
      },
      printer: {
        configured: true,
        isDefault: true,
        lastValidatedAt: null,
        printer: {
          id: 1,
          restaurantId: 1,
          printerId: "linux-usb-sim-01",
          displayName: "Sim",
          platform: "linux",
          transport: "usb",
          isDefault: true,
          isActive: true,
          lastValidatedAt: null,
          capabilities: null,
        },
        status: null,
      },
    });

    expect(state.canPrint).toBe(false);
    expect(state.nextAction).toBe("setup_printer");
  });

  it("derives provisioning workflow when connector offline", () => {
    const state = deriveProvisioningWorkflowState({
      connector: { connectionStatus: "offline" } as never,
      isDiscovering: false,
      isProvisioning: false,
      provisioned: false,
      printerCount: 0,
    });
    expect(state).toBe("connector_offline");
  });

  it("derives onboarding step from setup progress", () => {
    expect(
      deriveOnboardingStep({
        connectorOk: false,
        sessionOk: false,
        printerConfigured: false,
        printerIsDefault: false,
        printerTested: false,
        printerReady: false,
        discoveredCount: 0,
      })
    ).toBe(1);

    expect(
      deriveOnboardingStep({
        connectorOk: true,
        sessionOk: true,
        printerConfigured: true,
        printerIsDefault: true,
        printerTested: true,
        printerReady: true,
        discoveredCount: 1,
      })
    ).toBe("ready");
  });

  it("labels printer paper out for operators", () => {
    expect(printerStateLabel("paper_out", "en")).toBe("Paper out");
  });
});
