import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_ASSETS } from "./audioAssets";
import {
  CUSTOMER_ALERT_PATTERN,
  ensureNotificationAudioReady,
  getNotificationAudioContextState,
  playCustomerAlertSound,
  playOwnerNotificationSound,
  resetNotificationAudioForTests,
} from "./notificationSound";

function stubWebAudio() {
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function MockAudioContext(this: {
      state: AudioContextState;
      currentTime: number;
      destination: object;
      resume: ReturnType<typeof vi.fn>;
      createOscillator: ReturnType<typeof vi.fn>;
      createGain: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    }) {
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
      this.close = vi.fn();
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
}

describe("notificationSound HOTFIX-1B / Web Audio fallback", () => {
  beforeEach(() => {
    vi.stubGlobal("Audio", undefined);
    stubWebAudio();
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

describe("notificationSound AUDIO-TUNE-1 fallback patterns", () => {
  let createOscillator: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal("Audio", undefined);
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
        close: ReturnType<typeof vi.fn>;
      }) {
        this.state = "running";
        this.currentTime = 0;
        this.destination = {};
        this.close = vi.fn();
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

  it("Alert #1 fallback pattern within target duration", () => {
    expect(CUSTOMER_ALERT_PATTERN.high.totalMs).toBeLessThanOrEqual(1000);
  });

  it("schedules two oscillators per customer fallback tier", async () => {
    await ensureNotificationAudioReady();
    playCustomerAlertSound("high");
    expect(createOscillator).toHaveBeenCalledTimes(2);
  });
});

describe("notificationSound NOTIFICATION-AUDIO-1 assets", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNotificationAudioForTests();
  });

  it("playOwnerNotificationSound prefers owner WAV asset", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn(function (this: { preload: string; volume: number; currentTime: number; play: typeof play }) {
      this.preload = "";
      this.volume = 1;
      this.currentTime = 0;
      this.play = play;
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("Audio", AudioMock);
    resetNotificationAudioForTests();

    expect(playOwnerNotificationSound()).toBe(true);
    expect(AudioMock).toHaveBeenCalledWith(AUDIO_ASSETS.OWNER_ALERT);
    expect(play).toHaveBeenCalled();
  });

  it("playCustomerAlertSound prefers customer READY WAV asset", () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const AudioMock = vi.fn(function (this: { preload: string; volume: number; currentTime: number; play: typeof play }) {
      this.preload = "";
      this.volume = 1;
      this.currentTime = 0;
      this.play = play;
    });
    vi.stubGlobal("window", {});
    vi.stubGlobal("Audio", AudioMock);
    resetNotificationAudioForTests();

    expect(playCustomerAlertSound("high")).toBe(true);
    expect(AudioMock).toHaveBeenCalledWith(AUDIO_ASSETS.CUSTOMER_READY);
  });
});
