import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureNotificationAudioReady,
  getNotificationAudioContextState,
  playCustomerAlertSound,
  resetNotificationAudioForTests,
} from "./notificationSound";

describe("notificationSound HOTFIX-1B", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function MockAudioContext(this: {
        state: AudioContextState;
        currentTime: number;
        destination: object;
        resume: ReturnType<typeof vi.fn>;
        createOscillator: ReturnType<typeof vi.fn>;
        createGain: ReturnType<typeof vi.fn>;
      }) {
        this.state = "suspended";
        this.currentTime = 0;
        this.destination = {};
        this.resume = vi.fn(async () => {
          this.state = "running";
        });
        this.createOscillator = vi.fn(() => ({
          connect: vi.fn(),
          frequency: { value: 0 },
          type: "sine",
          start: vi.fn(),
          stop: vi.fn(),
        }));
        this.createGain = vi.fn(() => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }));
      })
    );
    vi.stubGlobal("window", {
      AudioContext: globalThis.AudioContext,
    });
    resetNotificationAudioForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ensureNotificationAudioReady returns true only when context is running", async () => {
    const ready = await ensureNotificationAudioReady();
    expect(ready).toBe(true);
    expect(getNotificationAudioContextState()).toBe("running");
  });

  it("playCustomerAlertSound returns false when context is not running", () => {
    expect(playCustomerAlertSound("high")).toBe(false);
  });

  it("playCustomerAlertSound returns true after audio is ready", async () => {
    await ensureNotificationAudioReady();
    expect(playCustomerAlertSound("high")).toBe(true);
  });
});
