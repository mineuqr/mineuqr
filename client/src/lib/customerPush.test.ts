/**
 * SUBSCRIPTION-VALIDATION-1 — staged enrollment trace tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPushSubscribeTraceSnapshot,
  getPushSupportSnapshot,
  isPushTraceEnabled,
  recordPushSubscribeFailure,
  recordPushSubscribeStage,
  recordPushSubscribeSuccess,
  resetPushSubscribeTrace,
} from "./customerPushDiagnostics";

describe("customerPushDiagnostics SUBSCRIPTION-VALIDATION-1", () => {
  beforeEach(() => {
    resetPushSubscribeTrace();
    vi.stubGlobal("window", {
      location: { search: "?pushTrace=1" },
      sessionStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
      matchMedia: vi.fn(() => ({ matches: false })),
    });
    vi.stubGlobal("navigator", { serviceWorker: {} });
    vi.stubGlobal("Notification", { permission: "default" });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetPushSubscribeTrace();
  });

  it("isPushTraceEnabled when pushTrace query param present", () => {
    expect(isPushTraceEnabled()).toBe(true);
  });

  it("records staged enrollment trace in order", () => {
    recordPushSubscribeStage("activation_started");
    recordPushSubscribeStage("permission_before", { permission: "default" });
    recordPushSubscribeStage("permission_after", { permission: "granted" });
    recordPushSubscribeStage("support_check", { pushManager: true });

    const trace = getPushSubscribeTraceSnapshot();
    expect(trace.stages).toEqual([
      "activation_started",
      "permission_before",
      "permission_after",
      "support_check",
    ]);
    expect(trace.lastStage).toBe("support_check");
    expect(trace.failureStage).toBeNull();
  });

  it("records failure stage on enrollment failure", () => {
    recordPushSubscribeStage("support_check");
    recordPushSubscribeFailure("unsupported");

    const trace = getPushSubscribeTraceSnapshot();
    expect(trace.failureStage).toBe("unsupported");
    expect(trace.pushSubscribed).toBe(false);
  });

  it("records success on subscribe_api_success", () => {
    recordPushSubscribeStage("subscribe_api_started");
    recordPushSubscribeSuccess({ subscriptionId: 42, httpStatus: 200 });

    const trace = getPushSubscribeTraceSnapshot();
    expect(trace.pushSubscribed).toBe(true);
    expect(trace.subscriptionId).toBe(42);
    expect(trace.httpStatus).toBe(200);
    expect(trace.failureStage).toBeNull();
    expect(trace.lastStage).toBe("enrollment_complete");
    expect(trace.stages).toContain("subscribe_api_success");
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
