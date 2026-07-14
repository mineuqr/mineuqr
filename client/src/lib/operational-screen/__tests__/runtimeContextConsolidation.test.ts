import { describe, expect, it, vi } from "vitest";
import { freezeRuntimeInstanceContext } from "../runtimeInstanceContext";
import type { RuntimeInstanceContext } from "../runtimeInstanceContext";
import { createRuntimeContextStore } from "../runtimeContextStore";

function sampleContext(instanceId: string): RuntimeInstanceContext {
  return {
    identity: {
      instanceId,
      businessId: "10",
      displayIdentity: `Screen ${instanceId}`,
      deviceId: `dev-${instanceId}`,
    },
    screen: {
      screenId: `dev-${instanceId}`,
      screenType: "kitchen_display",
      displayName: `Screen ${instanceId}`,
      location: null,
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
      tenantId: 10,
      restaurantSlug: "demo",
      branchId: null,
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
      configRevision: "1",
      settings: {
        language: "ar",
        displayDirection: "rtl",
        displayDensity: "large",
        visibleCategoryIds: [],
      },
      features: {
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
      theme: { language: "ar", direction: "rtl", density: "large" },
    },
    capabilities: {
      supportedActions: [],
      supportedEvents: [],
      supportedViews: ["kitchen"],
      supportedPrinting: false,
      negotiatedFeatures: [],
    },
    session: {
      sessionId: "tok-1",
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

describe("RUNTIME-CONTEXT-CONSOLIDATION-1", () => {
  it("does not expose a module-level mutable singleton store", async () => {
    const module = await import("../runtimeContextStore");
    expect(module.createRuntimeContextStore).toBeTypeOf("function");
    expect(Object.keys(module)).not.toContain("runtimeContextStore");
  });

  it("isolates snapshots across independent store instances", () => {
    const storeA = createRuntimeContextStore();
    const storeB = createRuntimeContextStore();

    const snapshotA = freezeRuntimeInstanceContext(sampleContext("a"));
    const snapshotB = freezeRuntimeInstanceContext(sampleContext("b"));

    storeA.replaceSnapshot(snapshotA, "bootstrap");
    storeB.replaceSnapshot(snapshotB, "bootstrap");

    expect(storeA.getCurrentSnapshot()?.identity.instanceId).toBe("a");
    expect(storeB.getCurrentSnapshot()?.identity.instanceId).toBe("b");
  });

  it("notifies only subscribers of the store that published the snapshot", () => {
    const storeA = createRuntimeContextStore();
    const storeB = createRuntimeContextStore();
    const listenerA = vi.fn();
    const listenerB = vi.fn();

    storeA.subscribe(listenerA);
    storeB.subscribe(listenerB);

    storeA.replaceSnapshot(freezeRuntimeInstanceContext(sampleContext("a")), "bootstrap");

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).not.toHaveBeenCalled();
  });

  it("returns the same snapshot reference from getCurrentSnapshot after replace", () => {
    const store = createRuntimeContextStore();
    const snapshot = freezeRuntimeInstanceContext(sampleContext("same"));
    store.replaceSnapshot(snapshot, "bootstrap");
    expect(store.getCurrentSnapshot()).toBe(snapshot);
  });
});
