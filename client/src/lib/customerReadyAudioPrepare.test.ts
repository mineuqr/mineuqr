import { afterEach, describe, expect, it, vi } from "vitest";
import { resetNotificationAudioForTests } from "./notificationSound";
import {
  isCustomerReadyAudioPrepared,
  prepareCustomerReadyAudioFromUserGesture,
  resetCustomerReadyAudioPrepareForTests,
} from "./customerReadyAudioPrepare";

vi.mock("./notificationSound", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./notificationSound")>();
  return {
    ...actual,
    unlockCustomerReadyAudioFromGesture: vi.fn().mockResolvedValue(true),
    playCustomerAlertSound: vi.fn().mockReturnValue(true),
  };
});

import {
  playCustomerAlertSound,
  unlockCustomerReadyAudioFromGesture,
} from "./notificationSound";

describe("customerReadyAudioPrepare AUDIO-ENABLE-UX-1", () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetCustomerReadyAudioPrepareForTests();
    resetNotificationAudioForTests();
  });

  it("prepares audio via unlockCustomerReadyAudioFromGesture only", async () => {
    const ready = await prepareCustomerReadyAudioFromUserGesture();

    expect(ready).toBe(true);
    expect(unlockCustomerReadyAudioFromGesture).toHaveBeenCalledTimes(1);
    expect(playCustomerAlertSound).not.toHaveBeenCalled();
    expect(isCustomerReadyAudioPrepared()).toBe(true);
  });

  it("does not call unlock again when already prepared", async () => {
    await prepareCustomerReadyAudioFromUserGesture();
    await prepareCustomerReadyAudioFromUserGesture();

    expect(unlockCustomerReadyAudioFromGesture).toHaveBeenCalledTimes(1);
  });
});
