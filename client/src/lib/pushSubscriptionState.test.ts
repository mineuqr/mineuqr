import { describe, expect, it } from "vitest";
import {
  detectInitialPushSubscriptionState,
  getPushSubscriptionUserMessage,
  isBackgroundPushReady,
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
});
