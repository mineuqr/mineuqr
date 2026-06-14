import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_ASSETS } from "./audioAssets";
import {
  ensureNotificationAudioReady,
  playCustomerAlertSound,
  resetNotificationAudioForTests,
} from "./notificationSound";
import {
  isAudio4SpikeEnabled,
  isCustomerReadyAudioSpikeKeepAliveActive,
  playDecodedReadyBuffer,
  prepareCustomerReadyAudioFromGesture,
} from "./customerReadyAudioSpike4";

function stubSpikeAudioContext() {
  const oscStart = vi.fn();
  const bufferStart = vi.fn();
  const decodeAudioData = vi.fn(async () =>
    ({
      duration: 5.2,
      sampleRate: 44100,
      numberOfChannels: 2,
    }) as AudioBuffer
  );
  const createBufferSource = vi.fn(() => ({
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: bufferStart,
  }));

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
      createBufferSource: ReturnType<typeof vi.fn>;
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
        start: oscStart,
        stop: vi.fn(),
      }));
      this.createGain = vi.fn(() => ({
        gain: { value: 0 },
        connect: vi.fn(),
      }));
      this.createBufferSource = createBufferSource;
    })
  );

  return { oscStart, bufferStart, decodeAudioData, createBufferSource };
}

function stubAudio4Window() {
  vi.stubGlobal("window", {
    location: { search: "?audio4=1" },
    sessionStorage: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    AudioContext: globalThis.AudioContext,
  });
}

describe("customerReadyAudioSpike4 AUDIO-HOTFIX-4-SPIKE-1", () => {
  beforeEach(() => {
    resetNotificationAudioForTests();
    stubSpikeAudioContext();
    stubAudio4Window();
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

  it("isAudio4SpikeEnabled when ?audio4=1 present", () => {
    expect(isAudio4SpikeEnabled()).toBe(true);
  });

  it("prepareCustomerReadyAudioFromGesture decodes Mixkit and starts keep-alive without HTML play", async () => {
    const htmlPlay = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: { play: typeof htmlPlay }) {
        this.play = htmlPlay;
      })
    );

    const result = await prepareCustomerReadyAudioFromGesture();

    expect(result.bufferReady).toBe(true);
    expect(result.audioContextReady).toBe(true);
    expect(fetch).toHaveBeenCalledWith(AUDIO_ASSETS.CUSTOMER_READY);
    expect(isCustomerReadyAudioSpikeKeepAliveActive()).toBe(true);
    expect(htmlPlay).not.toHaveBeenCalled();
  });

  it("playDecodedReadyBuffer uses AudioBufferSourceNode after prepare", async () => {
    const { createBufferSource, bufferStart } = stubSpikeAudioContext();
    stubAudio4Window();
    resetNotificationAudioForTests();
    await prepareCustomerReadyAudioFromGesture();

    expect(playDecodedReadyBuffer("high")).toBe(true);
    expect(createBufferSource).toHaveBeenCalled();
    expect(bufferStart).toHaveBeenCalled();
  });

  it("playCustomerAlertSound routes to buffer playback when spike enabled", async () => {
    const { createBufferSource } = stubSpikeAudioContext();
    stubAudio4Window();
    resetNotificationAudioForTests();
    await prepareCustomerReadyAudioFromGesture();
    const htmlPlay = vi.fn();
    vi.stubGlobal(
      "Audio",
      vi.fn(function (this: { play: typeof htmlPlay }) {
        this.play = htmlPlay;
      })
    );

    expect(playCustomerAlertSound("high")).toBe(true);
    expect(createBufferSource).toHaveBeenCalled();
    expect(htmlPlay).not.toHaveBeenCalled();
  });

  it("playCustomerAlertSound falls back to Web Audio beeps when buffer missing", async () => {
    const createOscillator = vi.fn(() => ({
      connect: vi.fn(),
      frequency: { value: 0 },
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
        this.resume = vi.fn();
        this.createOscillator = createOscillator;
        this.createGain = vi.fn(() => ({
          connect: vi.fn(),
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        }));
      })
    );
    stubAudio4Window();
    resetNotificationAudioForTests();
    await ensureNotificationAudioReady();

    expect(playCustomerAlertSound("high")).toBe(true);
    expect(createOscillator).toHaveBeenCalled();
  });
});
