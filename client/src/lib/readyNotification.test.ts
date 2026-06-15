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
  isCustomerPushSupported: vi.fn().mockReturnValue(false),
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

describe("readyNotification AUDIO-HOTFIX-3A", () => {
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
    vi.stubGlobal("navigator", {
      serviceWorker: undefined,
      userAgent: "vitest",
    });
    vi.stubGlobal("window", {
      AudioContext: globalThis.AudioContext,
      Notification: globalThis.Notification,
      matchMedia: () => ({ matches: false }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNotificationAudioForTests();
  });

  it("activateReadyAlertsFromGesture silently unlocks CUSTOMER_READY via muted play/pause", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: {
        muted: boolean;
        volume: number;
        currentTime: number;
        play: typeof play;
        pause: typeof pause;
      }) {
        this.muted = false;
        this.volume = 1;
        this.currentTime = 0;
        this.play = play;
        this.pause = pause;
      })
    );

    const result = await activateReadyAlertsFromGesture({
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });

    expect(result.audioReady).toBe(true);
    expect(result.permission).toBe("granted");
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).toHaveBeenCalledTimes(1);
  });
});

describe("readyNotification AUDIO-HOTFIX-4-SPIKE-1", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    resetNotificationAudioForTests();
    const decodeAudioData = vi.fn(async () =>
      ({
        duration: 5.2,
        sampleRate: 44100,
        numberOfChannels: 2,
      }) as AudioBuffer
    );
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function MockAudioContext(this: {
        state: AudioContextState;
        currentTime: number;
        destination: object;
        resume: ReturnType<typeof vi.fn>;
        decodeAudioData: ReturnType<typeof vi.fn>;
        createOscillator: ReturnType<typeof vi.fn>;
        createGain: ReturnType<typeof vi.fn>;
      }) {
        this.state = "suspended";
        this.currentTime = 0;
        this.destination = {};
        this.resume = vi.fn(async () => {
          this.state = "running";
        });
        this.decodeAudioData = decodeAudioData;
        this.createOscillator = vi.fn(() => ({
          frequency: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }));
        this.createGain = vi.fn(() => ({
          gain: { value: 0 },
          connect: vi.fn(),
        }));
      })
    );
    vi.stubGlobal("Notification", {
      permission: "granted" as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue("granted"),
    });
    vi.stubGlobal("navigator", {
      serviceWorker: undefined,
      userAgent: "vitest",
    });
    vi.stubGlobal("window", {
      location: { search: "?audio4=1" },
      AudioContext: globalThis.AudioContext,
      Notification: globalThis.Notification,
      sessionStorage: globalThis.sessionStorage,
      matchMedia: () => ({ matches: false }),
    });
    global.fetch = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(16),
    })) as typeof fetch;
    vi.stubGlobal("Audio", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNotificationAudioForTests();
  });

  it("activateReadyAlertsFromGesture uses decode path without HTML play when spike enabled", async () => {
    const htmlPlay = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: { play: typeof htmlPlay }) {
        this.play = htmlPlay;
      })
    );

    const result = await activateReadyAlertsFromGesture({
      trackingToken: "tok123456789012345",
      slug: "cafe",
    });

    expect(result.audioReady).toBe(true);
    expect(fetch).toHaveBeenCalled();
    expect(htmlPlay).not.toHaveBeenCalled();
  });
});
