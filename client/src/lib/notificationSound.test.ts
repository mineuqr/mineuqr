import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CUSTOMER_ALERT_PATTERN,
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

describe("notificationSound AUDIO-TUNE-1", () => {
  let createOscillator: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createOscillator = vi.fn(() => ({
      connect: vi.fn(),
      frequency: { value: 0 },
      type: "sine",
      start: vi.fn(),
      stop: vi.fn(),
    }));
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
        this.state = "running";
        this.currentTime = 0;
        this.destination = {};
        this.resume = vi.fn(async () => {
          this.state = "running";
        });
        this.createOscillator = createOscillator;
        this.createGain = vi.fn(() => ({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
        }));
      })
    );
    vi.stubGlobal("window", { AudioContext: globalThis.AudioContext });
    resetNotificationAudioForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Alert #1 uses two-beeps with 120ms pause pattern within target duration", () => {
    expect(CUSTOMER_ALERT_PATTERN.high).toEqual({
      beep1Ms: 120,
      pauseMs: 120,
      beep2Ms: 220,
      totalMs: 460,
    });
    expect(CUSTOMER_ALERT_PATTERN.high.totalMs).toBeGreaterThanOrEqual(460);
    expect(CUSTOMER_ALERT_PATTERN.high.totalMs).toBeLessThanOrEqual(1000);
  });

  it("Alert #2 is shorter and softer than Alert #1", () => {
    expect(CUSTOMER_ALERT_PATTERN.medium.totalMs).toBeLessThan(
      CUSTOMER_ALERT_PATTERN.high.totalMs
    );
  });

  it("schedules two oscillators per alert tier", async () => {
    await ensureNotificationAudioReady();
    playCustomerAlertSound("high");
    expect(createOscillator).toHaveBeenCalledTimes(2);

    createOscillator.mockClear();
    playCustomerAlertSound("medium");
    expect(createOscillator).toHaveBeenCalledTimes(2);
  });
});
