import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  freezeRuntimeInstanceContext,
  type RuntimeInstanceContext,
} from "../runtimeInstanceContext";
import { createRuntimeActions } from "../runtimeContextActions";
import { createRuntimeContextStore } from "../runtimeContextStore";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sampleContext(instanceId: string): RuntimeInstanceContext {
  return {
    identity: {
      instanceId,
      businessId: "720007",
      displayIdentity: `Runtime ${instanceId}`,
      deviceId: `device-${instanceId}`,
    },
    screen: {
      screenId: `device-${instanceId}`,
      screenType: "kitchen_display",
      displayName: `Runtime ${instanceId}`,
      location: "3",
      zone: null,
      status: "active",
    },
    role: {
      role: "kitchen_display",
      permissions: {
        canAccessKitchenQueue: true,
        canAccessPrintMonitor: false,
        canExecuteOrderActions: true,
        declared: {
          supportsOrders: true,
          supportsTickets: true,
          supportsQueue: true,
          supportsReadyOrders: true,
          supportsDensity: true,
          supportsCategoryFilter: true,
          supportsTimeline: false,
          supportsAnimation: false,
          supportsPrintMonitor: false,
          supportsKioskOrdering: false,
        },
      },
      visibility: { operational: true, blockedReason: null },
    },
    business: {
      businessName: null,
      tenantId: 720007,
      restaurantSlug: "demo",
      branchId: 3,
      timezone: null,
      currency: null,
      language: "ar",
    },
    device: {
      deviceModel: "web",
      platform: "web",
      runtimeVersion: "test",
      pairingState: "paired",
    },
    configuration: {
      configRevision: "42",
      settings: {
        language: "ar",
        displayDirection: "rtl",
        density: "comfortable",
        categoryFilter: null,
      },
      features: {},
      theme: {},
    },
    capabilities: {
      supportedActions: ["execute-order-action"],
      supportedEvents: ["bootstrap", "heartbeat_refresh"],
      supportedViews: ["kitchen"],
      supportedPrinting: false,
      negotiatedFeatures: ["kitchen_queue"],
    },
    session: {
      sessionId: "token-1",
      issuedAt: "2026-07-10T12:00:00.000Z",
      expiresAt: null,
      lastHeartbeat: null,
    },
    metadata: {
      schemaVersion: 1,
      runtimeVersion: "test",
      createdAt: "2026-07-10T12:00:00.000Z",
    },
  };
}

describe("RUNTIME-CONTEXT-ACTIONS-1", () => {
  it("delegates every runtime action to the orchestrator source", async () => {
    const refresh = vi.fn(async () => undefined);
    const reloadConfiguration = vi.fn(async () => undefined);
    const unpair = vi.fn();
    const retry = vi.fn(async () => undefined);

    const actions = createRuntimeActions({
      refresh,
      reloadConfiguration,
      unpair,
      retry,
    });

    await actions.refresh();
    await actions.reloadConfiguration();
    actions.unpair();
    await actions.retry();

    expect(refresh).toHaveBeenCalledOnce();
    expect(reloadConfiguration).toHaveBeenCalledOnce();
    expect(unpair).toHaveBeenCalledOnce();
    expect(retry).toHaveBeenCalledOnce();
  });

  it("notifies subscribers after successful snapshot replacement", () => {
    const store = createRuntimeContextStore();
    const events: string[] = [];
    store.subscribe((event) => {
      events.push(event.reason);
    });

    const first = freezeRuntimeInstanceContext(sampleContext("first"));
    const second = freezeRuntimeInstanceContext({
      ...sampleContext("second"),
      session: {
        ...sampleContext("second").session,
        lastHeartbeat: "2026-07-10T12:10:00.000Z",
      },
    });

    store.replaceSnapshot(first, "bootstrap");
    store.replaceSnapshot(second, "manual_refresh");

    expect(events).toEqual(["bootstrap", "manual_refresh"]);
    expect(store.getCurrentSnapshot()?.identity.instanceId).toBe("second");
  });

  it("does not corrupt RuntimeContextStore when clearing during repair", () => {
    const store = createRuntimeContextStore();
    const snapshot = freezeRuntimeInstanceContext(sampleContext("repair"));
    store.replaceSnapshot(snapshot, "bootstrap");

    const cleared = store.replaceSnapshot(null, "repairing");

    expect(cleared.currentContext).toBeNull();
    expect(cleared.previousContext?.identity.instanceId).toBe("repair");
    expect(store.getCurrentSnapshot()).toBeNull();
  });

  it("useRuntimeActions is a thin provider facade without store or factory access", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const actionModule = read("client/src/lib/operational-screen/runtimeContextActions.ts");
    const shell = read("client/src/components/operational-screen/OperationalScreenShell.tsx");
    const entry = read("client/src/pages/screen/OperationalScreenEntry.tsx");

    expect(provider).toContain("export function useRuntimeActions()");
    expect(provider).toContain("createRuntimeActions({ refresh, reloadConfiguration, unpair, retry })");
    expect(actionModule).toContain("createRuntimeActions");
    expect(actionModule).not.toMatch(/useState|useEffect|useSyncExternalStore|RuntimeContextFactory/);
    expect(actionModule).not.toContain("RuntimeContextStore");
    expect(shell).toContain("useRuntimeActions");
    expect(shell).not.toContain("useScreenRuntime");
    expect(entry).toContain("useRuntimeActions");
    expect(entry).not.toMatch(/const \{[^}]*retry[^}]*\} = useScreenRuntime\(\)/);
  });

  it("keeps useScreenRuntime as the advanced orchestrator API", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const orchestrator = read("client/src/lib/operational-screen/useRuntimeOrchestrator.ts");

    expect(provider).toContain("export function useScreenRuntime()");
    expect(orchestrator).toContain("refresh:");
    expect(orchestrator).toContain("reloadConfiguration:");
    expect(orchestrator).not.toMatch(/export const runtimeContextStore/);
  });
});
