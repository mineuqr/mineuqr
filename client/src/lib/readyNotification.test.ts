import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildReadyNotificationCopy,
  isReadyTransition,
  loadReadyAlertState,
  readyAlertStorageKey,
  saveReadyAlertState,
  wasReadyAlertDelivered,
} from "./readyNotification";

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

describe("readyNotification CUSTOMER-UX-1C", () => {
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
      alert1Sent: true,
      alert2Sent: false,
      acknowledged: false,
      lastStatus: "ready",
    });
    expect(sessionStorage.getItem(readyAlertStorageKey(token))).toBeTruthy();
    expect(loadReadyAlertState(token)).toMatchObject({
      alert1Sent: true,
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
});
