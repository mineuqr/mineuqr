import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNotificationAudioForTests } from "./notificationSound";
import {
  attachCustomerReadyAudioPrepareOnFirstGesture,
  isCustomerReadyAudioPrepared,
  resetCustomerReadyAudioPrepareForTests,
} from "./customerReadyAudioPrepare";

vi.mock("./notificationSound", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./notificationSound")>();
  return {
    ...actual,
    unlockCustomerReadyAudioFromGesture: vi.fn().mockResolvedValue(true),
  };
});

import { unlockCustomerReadyAudioFromGesture } from "./notificationSound";

function stubWindowWithListeners() {
  const listeners = new Map<string, Set<EventListener>>();
  vi.stubGlobal("window", {
    addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
  });
  return listeners;
}

describe("customerReadyAudioPrepare READY-AUDIO-RECOVERY-1", () => {
  beforeEach(() => {
    stubWindowWithListeners();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    resetCustomerReadyAudioPrepareForTests();
    resetNotificationAudioForTests();
  });

  it("prepares audio once on first pointerdown", async () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const detach = attachCustomerReadyAudioPrepareOnFirstGesture();
    expect(addSpy).toHaveBeenCalledWith("pointerdown", expect.any(Function), {
      capture: true,
      passive: true,
    });
    expect(addSpy).toHaveBeenCalledWith("touchstart", expect.any(Function), {
      capture: true,
      passive: true,
    });

    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();

    expect(unlockCustomerReadyAudioFromGesture).toHaveBeenCalledTimes(1);
    expect(isCustomerReadyAudioPrepared()).toBe(true);
    expect(removeSpy).toHaveBeenCalled();

    window.dispatchEvent(new Event("pointerdown"));
    await Promise.resolve();
    expect(unlockCustomerReadyAudioFromGesture).toHaveBeenCalledTimes(1);

    detach();
  });

  it("does not attach twice when already prepared", async () => {
    attachCustomerReadyAudioPrepareOnFirstGesture();
    window.dispatchEvent(new Event("touchstart"));
    await Promise.resolve();

    const addSpy = vi.spyOn(window, "addEventListener");
    attachCustomerReadyAudioPrepareOnFirstGesture();
    expect(addSpy).not.toHaveBeenCalled();
  });
});
