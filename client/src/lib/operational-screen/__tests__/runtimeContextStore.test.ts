import { describe, expect, it, vi } from "vitest";
import { freezeRuntimeInstanceContext } from "../runtimeInstanceContext";
import type { RuntimeInstanceContext } from "../runtimeInstanceContext";
import { createRuntimeContextStore } from "../runtimeContextStore";

function sampleContext(instanceId: string): RuntimeInstanceContext {
  return {
    identity: {
      instanceId,
      businessId: "10",
      displayIdentity: "Kitchen A",
      deviceId: "dev-01",
    },
    screen: {
      screenId: "dev-01",
      screenType: "kitchen_display",
      displayName: "Kitchen A",
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
        },
      },
      visibility: { operational: true, blockedReason: null },
    },
    business: {
      businessName: null,
      tenantId: 10,
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
      },
      theme: { language: "ar", direction: "rtl", density: "large" },
    },
    capabilities: {
      supportedActions: ["view-kitchen-queue"],
      supportedEvents: ["bootstrap"],
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

describe("RuntimeContextStore RUNTIME-CONTEXT-SUBSCRIPTIONS-1", () => {
  it("starts with no snapshot", () => {
    const store = createRuntimeContextStore();
    expect(store.getCurrentSnapshot()).toBeNull();
  });

  it("notifies subscribers on replaceSnapshot", () => {
    const store = createRuntimeContextStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const first = freezeRuntimeInstanceContext(sampleContext("boot-1"));
    store.replaceSnapshot(first, "bootstrap");

    expect(store.getCurrentSnapshot()).toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      previousContext: null,
      currentContext: first,
      reason: "bootstrap",
    });
  });

  it("unsubscribes cleanly", () => {
    const store = createRuntimeContextStore();
    const listener = vi.fn();
    const subscription = store.subscribe(listener);
    subscription.unsubscribe();

    store.replaceSnapshot(freezeRuntimeInstanceContext(sampleContext("boot-2")), "bootstrap");
    expect(listener).not.toHaveBeenCalled();
  });

  it("replaces snapshots atomically with previousContext preserved in event", () => {
    const store = createRuntimeContextStore();
    const first = freezeRuntimeInstanceContext(sampleContext("boot-3"));
    const second = freezeRuntimeInstanceContext({
      ...sampleContext("boot-3"),
      identity: { ...sampleContext("boot-3").identity, displayIdentity: "Kitchen B" },
    });

    store.replaceSnapshot(first, "bootstrap");
    const event = store.replaceSnapshot(second, "configuration_reload");

    expect(store.getCurrentSnapshot()).toBe(second);
    expect(event.previousContext).toBe(first);
    expect(event.currentContext).toBe(second);
    expect(event.reason).toBe("configuration_reload");
    expect(event.changedAt).toBeTruthy();
  });

  it("supports clearing snapshot during repairing", () => {
    const store = createRuntimeContextStore();
    const snapshot = freezeRuntimeInstanceContext(sampleContext("boot-4"));
    store.replaceSnapshot(snapshot, "bootstrap");

    const cleared = store.replaceSnapshot(null, "repairing");
    expect(store.getCurrentSnapshot()).toBeNull();
    expect(cleared.previousContext).toBe(snapshot);
    expect(cleared.currentContext).toBeNull();
  });

  it("delivers complete snapshots to multiple subscribers", () => {
    const store = createRuntimeContextStore();
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe(a);
    store.subscribe(b);

    const snapshot = freezeRuntimeInstanceContext(sampleContext("boot-5"));
    store.replaceSnapshot(snapshot, "heartbeat_refresh");

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0]?.[0].currentContext).toBe(snapshot);
    expect(b.mock.calls[0]?.[0].currentContext).toBe(snapshot);
  });
});
