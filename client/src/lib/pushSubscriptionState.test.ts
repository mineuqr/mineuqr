import { describe, expect, it, vi } from "vitest";
import * as diagnostics from "./customerPushDiagnostics";
import {
  detectInitialPushSubscriptionState,
  getIosPwaInstallSteps,
  getPushSubscriptionUserMessage,
  isBackgroundPushReady,
  isIosWebKitTabWithoutPush,
  resolvePushSubscriptionState,
  type PushSupportSnapshot,
} from "./pushSubscriptionState";

const supportedSnapshot: PushSupportSnapshot = {
  serviceWorker: true,
  pushManager: true,
  notification: true,
  displayModeStandalone: false,
  iosStandalone: false,
  permission: "default",
};

const unsupportedSnapshot: PushSupportSnapshot = {
  serviceWorker: true,
  pushManager: false,
  notification: true,
  displayModeStandalone: false,
  iosStandalone: false,
  permission: "default",
};

describe("pushSubscriptionState PUSH-SUBSCRIPTION-HARDENING-1", () => {
  it("detectInitialPushSubscriptionState returns SUBSCRIBED when session active", () => {
    expect(
      detectInitialPushSubscriptionState({
        pushSubscriptionActive: true,
        support: supportedSnapshot,
      })
    ).toBe("SUBSCRIBED");
  });

  it("detectInitialPushSubscriptionState returns NOT_SUPPORTED without PushManager", () => {
    expect(
      detectInitialPushSubscriptionState({
        pushSubscriptionActive: false,
        support: unsupportedSnapshot,
      })
    ).toBe("NOT_SUPPORTED");
  });

  it("resolvePushSubscriptionState maps success to SUBSCRIBED", () => {
    expect(
      resolvePushSubscriptionState({
        pushSubscribed: true,
        permission: "granted",
        pushSubscribeReason: "success",
        support: supportedSnapshot,
      })
    ).toBe("SUBSCRIBED");
  });

  it("resolvePushSubscriptionState maps unsupported to NOT_SUPPORTED", () => {
    expect(
      resolvePushSubscriptionState({
        pushSubscribed: false,
        permission: "granted",
        pushSubscribeReason: "unsupported",
        support: unsupportedSnapshot,
      })
    ).toBe("NOT_SUPPORTED");
  });

  it("resolvePushSubscriptionState maps skipped_permission to PERMISSION_DENIED when denied", () => {
    expect(
      resolvePushSubscriptionState({
        pushSubscribed: false,
        permission: "denied",
        pushSubscribeReason: "skipped_permission",
        support: supportedSnapshot,
      })
    ).toBe("PERMISSION_DENIED");
  });

  it("resolvePushSubscriptionState maps subscribe_api_failed to SUBSCRIBE_FAILED", () => {
    expect(
      resolvePushSubscriptionState({
        pushSubscribed: false,
        permission: "granted",
        pushSubscribeReason: "subscribe_api_failed",
        support: supportedSnapshot,
      })
    ).toBe("SUBSCRIBE_FAILED");
  });

  it("isBackgroundPushReady is true only for SUBSCRIBED", () => {
    expect(isBackgroundPushReady("SUBSCRIBED")).toBe(true);
    expect(isBackgroundPushReady("PERMISSION_REQUIRED")).toBe(false);
  });

  it("getPushSubscriptionUserMessage returns background push ready when subscribed", () => {
    expect(
      getPushSubscriptionUserMessage({
        state: "SUBSCRIBED",
        language: "en",
      })
    ).toBe("Background push ready");
  });

  it("getPushSubscriptionUserMessage returns service worker failure copy", () => {
    expect(
      getPushSubscriptionUserMessage({
        state: "SUBSCRIBE_FAILED",
        language: "en",
        pushSubscribeReason: "service_worker_failed",
      })
    ).toBe("Service Worker registration failed.");
  });

  it("getIosPwaInstallSteps returns four steps", () => {
    expect(getIosPwaInstallSteps("en")).toHaveLength(4);
  });

  it("isIosWebKitTabWithoutPush detects iOS without push", () => {
    vi.spyOn(diagnostics, "getPushSupportSnapshot").mockReturnValue({
      serviceWorker: true,
      pushManager: false,
      notification: true,
      displayModeStandalone: false,
      iosStandalone: false,
      permission: "default",
    });
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
    });
    expect(isIosWebKitTabWithoutPush()).toBe(true);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
});
