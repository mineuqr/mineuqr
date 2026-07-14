import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  freezeRuntimeInstanceContext,
  type RuntimeInstanceContext,
} from "../runtimeInstanceContext";
import {
  selectRuntimeBusiness,
  selectRuntimeCapabilities,
  selectRuntimeConfiguration,
  selectRuntimeDevice,
  selectRuntimeIdentity,
  selectRuntimeMetadata,
  selectRuntimeRole,
  selectRuntimeSession,
} from "../runtimeContextSelectors";
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
        displayDensity: "large",
        visibleCategoryIds: [1, 2],
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

describe("RUNTIME-CONTEXT-SELECTORS-1", () => {
  it("selects every stable RuntimeInstanceContext section", () => {
    const context = freezeRuntimeInstanceContext(sampleContext("001"));

    expect(selectRuntimeIdentity(context)).toBe(context.identity);
    expect(selectRuntimeBusiness(context)).toEqual({
      businessName: null,
      tenantId: 720007,
      timezone: null,
      currency: null,
      language: "ar",
    });
    expect(selectRuntimeDevice(context)).toBe(context.device);
    expect(selectRuntimeRole(context)).toBe(context.role);
    expect(selectRuntimeConfiguration(context)).toBe(context.configuration);
    expect(selectRuntimeCapabilities(context)).toEqual({
      supportedActions: ["execute-order-action"],
      supportedEvents: ["bootstrap", "heartbeat_refresh"],
      supportedViews: ["kitchen"],
      supportedPrinting: false,
    });
    expect(selectRuntimeSession(context)).toBe(context.session);
    expect(selectRuntimeMetadata(context)).toBe(context.metadata);
  });

  it("selectors stay synchronized after RuntimeContextStore snapshot replacement", () => {
    const store = createRuntimeContextStore();
    const first = freezeRuntimeInstanceContext(sampleContext("first"));
    const second = freezeRuntimeInstanceContext({
      ...sampleContext("second"),
      session: {
        ...sampleContext("second").session,
        lastHeartbeat: "2026-07-10T12:10:00.000Z",
      },
    });

    store.replaceSnapshot(first, "bootstrap");
    expect(selectRuntimeIdentity(store.getCurrentSnapshot()!).instanceId).toBe("first");

    store.replaceSnapshot(second, "heartbeat_refresh");
    expect(selectRuntimeIdentity(store.getCurrentSnapshot()!).instanceId).toBe("second");
    expect(selectRuntimeSession(store.getCurrentSnapshot()!).lastHeartbeat).toBe(
      "2026-07-10T12:10:00.000Z"
    );
  });

  it("selector hooks are thin provider facades without independent state or store subscriptions", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");
    const selectors = read("client/src/lib/operational-screen/runtimeContextSelectors.ts");

    expect(provider).toContain("export function useRuntimeIdentity()");
    expect(provider).toContain("selectRuntimeIdentity(useRuntimeInstanceContext())");
    expect(provider).toContain("export function useRuntimeMetadata()");
    expect(selectors).not.toMatch(/useState|useEffect|useSyncExternalStore|subscribeRuntimeContextStore/);
    expect(selectors).not.toContain("RuntimeContextFactory");
  });

  it("keeps useRuntimeInstanceContext as the advanced compatibility API", () => {
    const provider = read("client/src/components/operational-screen/OperationalScreenRuntimeProvider.tsx");

    expect(provider).toContain("export function useRuntimeInstanceContext()");
    expect(provider).toContain("export function useRuntimeRole()");
    expect(provider).toContain("instanceContext: FrozenRuntimeInstanceContext | null");
  });
});
