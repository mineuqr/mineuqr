/**
 * TRUE-PUSH-VALIDATION-1 — customer push client tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPushSupportSnapshot,
  isPushTraceEnabled,
} from "./customerPushDiagnostics";
import {
  isCustomerPushSupported,
  subscribeCustomerPush,
} from "./customerPush";

describe("customerPushDiagnostics", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { search: "?pushTrace=1" },
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal("navigator", {
      serviceWorker: {},
    });
    vi.stubGlobal("Notification", { permission: "default" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("isPushTraceEnabled when pushTrace query param present", () => {
    expect(isPushTraceEnabled()).toBe(true);
  });

  it("getPushSupportSnapshot reports API availability", () => {
    vi.stubGlobal("window", {
      location: { search: "" },
      sessionStorage: { getItem: () => null },
      matchMedia: () => ({ matches: false }),
      PushManager: class {},
    });
    vi.stubGlobal("PushManager", class {});
    expect(getPushSupportSnapshot().pushManager).toBe(true);
  });
});

describe("subscribeCustomerPush TRUE-PUSH-VALIDATION-1", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: { search: "?pushTrace=1" },
      sessionStorage: { getItem: () => null, setItem: vi.fn() },
      matchMedia: () => ({ matches: false }),
    });
    vi.stubGlobal("Notification", { permission: "granted" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported when PushManager is absent", async () => {
    vi.stubGlobal("navigator", { serviceWorker: {} });

    const result = await subscribeCustomerPush({
      trackingToken: "abc123token456789012",
      slug: "cafe",
    });

    expect(result.subscribed).toBe(false);
    expect(result.reason).toBe("unsupported");
    expect(isCustomerPushSupported()).toBe(false);
  });

  it("returns permission_denied when notification not granted", async () => {
    vi.stubGlobal("PushManager", class {});
    vi.stubGlobal("window", {
      location: { search: "?pushTrace=1" },
      sessionStorage: { getItem: () => null },
      matchMedia: () => ({ matches: false }),
      PushManager: globalThis.PushManager,
    });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("Notification", { permission: "denied" });

    const result = await subscribeCustomerPush({
      trackingToken: "abc123token456789012",
      slug: "cafe",
    });

    expect(result.reason).toBe("permission_denied");
  });
});
