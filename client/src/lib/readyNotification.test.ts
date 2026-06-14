import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNotificationAudioForTests } from "./notificationSound";
import {
  activateReadyAlertsFromGesture,
  buildReadyNotificationCopy,
  deliverReadyAlertTier,
  isReadyTransition,
  loadReadyAlertState,
  readyAlertStorageKey,
  saveReadyAlertState,
  wasReadyAlertDelivered,
} from "./readyNotification";

vi.mock("./customerPush", () => ({
  subscribeCustomerPush: vi.fn().mockResolvedValue({ subscribed: false, reason: "unsupported" }),
}));

function createSessionStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("readyNotification CUSTOMER-UX-1C HOTFIX-1", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects pending → ready and preparing → ready", () => {
    expect(isReadyTransition("pending", "ready")).toBe(true);
    expect(isReadyTransition("preparing", "ready")).toBe(true);
  });

  it("rejects ready → ready and initial ready", () => {
    expect(isReadyTransition("ready", "ready")).toBe(false);
    expect(isReadyTransition(null, "ready")).toBe(false);
    expect(isReadyTransition("pending", "preparing")).toBe(false);
  });

  it("persists alert session state per tracking token", () => {
    const token = "abc123";
    saveReadyAlertState(token, {
      alertsActivated: true,
      pushSubscriptionActive: false,
      alert1Sent: true,
      alert1NotificationDelivered: true,
      alert2Sent: false,
      alert2NotificationDelivered: false,
      acknowledged: false,
      lastStatus: "ready",
    });
    expect(sessionStorage.getItem(readyAlertStorageKey(token))).toBeTruthy();
    expect(loadReadyAlertState(token)).toMatchObject({
      alertsActivated: true,
      alert1Sent: true,
      alert1NotificationDelivered: true,
      alert2Sent: false,
      acknowledged: false,
      lastStatus: "ready",
    });
  });

  it("builds notification copy with order number only", () => {
    const copy = buildReadyNotificationCopy("ORD-0042", "ar");
    expect(copy.title).toBe("طلبك جاهز");
    expect(copy.body).toBe("ORD-0042");
  });

  it("wasReadyAlertDelivered is true if any channel succeeded", () => {
    expect(wasReadyAlertDelivered({ sound: false, notification: false, vibrate: false })).toBe(false);
    expect(wasReadyAlertDelivered({ sound: true, notification: false, vibrate: false })).toBe(true);
  });

  it("deliverReadyAlertTier skips channels when alerts are not activated", () => {
    const delivery = deliverReadyAlertTier({
      trackingToken: "tok",
      tier: 1,
      orderNumber: "ORD-1",
      language: "ar",
      alertsActivated: false,
    });
    expect(delivery).toEqual({ sound: false, notification: false, vibrate: false });
  });

  it("deliverReadyAlertTier skips page notification when push subscription active", () => {
    saveReadyAlertState("tok", {
      alertsActivated: true,
      pushSubscriptionActive: true,
      alert1Sent: false,
      alert1NotificationDelivered: false,
      alert2Sent: false,
      alert2NotificationDelivered: false,
      acknowledged: false,
    });

    vi.stubGlobal(
      "Notification",
      vi.fn(function (this: { onclick: () => void }, title: string) {
        this.onclick = () => {};
        return this;
      })
    );

    const delivery = deliverReadyAlertTier({
      trackingToken: "tok",
      tier: 1,
      orderNumber: "ORD-1",
      language: "ar",
      alertsActivated: true,
    });

    expect(delivery.notification).toBe(false);
    expect(globalThis.Notification).not.toHaveBeenCalled();
  });
});

describe("readyNotification AUDIO-HOTFIX-3", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    resetNotificationAudioForTests();
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function MockAudioContext(this: {
        state: AudioContextState;
        resume: ReturnType<typeof vi.fn>;
      }) {
        this.state = "suspended";
        this.resume = vi.fn(async () => {
          this.state = "running";
        });
      })
    );
    vi.stubGlobal("Notification", {
      permission: "granted" as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    vi.stubGlobal("window", {
      AudioContext: globalThis.AudioContext,
      Notification: globalThis.Notification,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNotificationAudioForTests();
  });

  it("activateReadyAlertsFromGesture unlocks audio without playing CUSTOMER_READY WAV", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: { play: typeof play }) {
        this.play = play;
      })
    );

    const result = await activateReadyAlertsFromGesture({
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });

    expect(result.audioReady).toBe(true);
    expect(result.permission).toBe("granted");
    expect(play).not.toHaveBeenCalled();
  });
});
