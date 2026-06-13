import { describe, expect, it, vi } from "vitest";

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
  },
}));

vi.mock("../_core/env", () => ({
  ENV: {
    vapidPublicKey: "BKxTestPublicKey",
    vapidPrivateKey: "testPrivateKey",
    vapidSubject: "mailto:test@mineuqr.com",
    isProduction: false,
  },
}));

import webpush from "web-push";
import {
  getVapidConfig,
  isCustomerPushConfigured,
  ensureWebPushVapidConfigured,
} from "./vapid";

describe("customerPush vapid", () => {
  it("detects configured VAPID keys", () => {
    expect(isCustomerPushConfigured()).toBe(true);
    expect(getVapidConfig()?.publicKey).toBe("BKxTestPublicKey");
  });

  it("configures web-push when keys present", () => {
    expect(ensureWebPushVapidConfigured()).toBe(true);
    expect(webpush.setVapidDetails).toHaveBeenCalled();
  });
});
