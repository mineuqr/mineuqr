/**
 * AUDIO-HOTFIX-4-SPIKE — prototype only (decode + keep-alive + buffer playback).
 * SPIKE-1: activation decode path. SPIKE-2: READY path + Media Session diagnostics.
 * Enable: ?audio4=1 on tracking URL or sessionStorage mineuqr:audio4:spike=1
 * Default production path remains HOTFIX-3A until spike PASS.
 */

import { AUDIO_ASSETS } from "@/lib/audioAssets";
import {
  ensureNotificationAudioReady,
  getSharedNotificationAudioContext,
  type AlertSoundIntensity,
} from "@/lib/notificationSound";

export const AUDIO4_SPIKE_BUILD = "AUDIO-HOTFIX-4-SPIKE-2";

export type Audio4ReadyPlaybackPath =
  | "playDecodedReadyBuffer"
  | "playCustomerAlertSoundWebAudioFallback"
  | "tryPlayAudioAsset"
  | "none";

let cachedReadyAudioBuffer: AudioBuffer | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;
let lastReadyPlaybackPath: Audio4ReadyPlaybackPath = "none";
let activeBufferSource: AudioBufferSourceNode | null = null;
let activeBufferGain: GainNode | null = null;

export function isAudio4SpikeEnabled(): boolean {
  if (import.meta.env.DEV && import.meta.env.VITE_AUDIO4_SPIKE === "1") {
    return true;
  }
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("audio4")) return true;
    return sessionStorage.getItem("mineuqr:audio4:spike") === "1";
  } catch {
    return false;
  }
}

export function logAudio4(message: string, metadata?: Record<string, unknown>): void {
  if (!isAudio4SpikeEnabled()) return;
  if (metadata) {
    console.info(`[mineuqr:audio4] ${message}`, { build: AUDIO4_SPIKE_BUILD, ...metadata });
  } else {
    console.info(`[mineuqr:audio4] ${message}`, { build: AUDIO4_SPIKE_BUILD });
  }
}

export function getLastAudio4ReadyPlaybackPath(): Audio4ReadyPlaybackPath {
  return lastReadyPlaybackPath;
}

export function getCachedReadyAudioBufferForSpike(): AudioBuffer | null {
  return cachedReadyAudioBuffer;
}

export function isCustomerReadyAudioSpikeKeepAliveActive(): boolean {
  return keepAliveOscillator !== null;
}

export function isCustomerReadyAudioSpikeBufferSourceActive(): boolean {
  return activeBufferSource !== null;
}

export function stopCustomerReadyAudioSpikeKeepAlive(): void {
  const wasActive = keepAliveOscillator !== null;
  try {
    keepAliveOscillator?.stop();
  } catch {
    /* already stopped */
  }
  keepAliveOscillator = null;
  keepAliveGain = null;
  if (wasActive) {
    logAudio4("keepalive stop", { reason: "explicit_stop" });
  }
}

function tryClearMediaSession(label: string): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
  try {
    navigator.mediaSession.playbackState = "none";
    navigator.mediaSession.metadata = null;
    logAudio4("media session clear attempted", { label });
  } catch (err) {
    logAudio4("media session clear failed", {
      label,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function logMediaSessionState(label: string): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    logAudio4("media session state", { label, supported: false });
    return;
  }
  const ms = navigator.mediaSession;
  logAudio4("media session state", {
    label,
    supported: true,
    playbackState: ms.playbackState,
    metadataTitle: ms.metadata?.title ?? null,
    metadataArtist: ms.metadata?.artist ?? null,
  });
}

function cleanupBufferPlaybackNodes(
  source: AudioBufferSourceNode,
  gain: GainNode,
  reason: string
): void {
  try {
    source.disconnect();
  } catch {
    /* already disconnected */
  }
  try {
    gain.disconnect();
  } catch {
    /* already disconnected */
  }

  const bufferSourceWasActive = activeBufferSource !== null;

  if (activeBufferSource === source) {
    activeBufferSource = null;
    activeBufferGain = null;
  }

  logAudio4("buffer cleanup", {
    reason,
    keepAliveWasActive: isCustomerReadyAudioSpikeKeepAliveActive(),
    bufferSourceWasActive,
  });

  stopCustomerReadyAudioSpikeKeepAlive();
  logAudio4("keepalive stopped after buffer ended", {
    keepAliveActive: isCustomerReadyAudioSpikeKeepAliveActive(),
  });

  tryClearMediaSession(reason);
  logMediaSessionState(`after buffer cleanup (${reason})`);
}

function startCustomerReadyAudioContextKeepAlive(): void {
  stopCustomerReadyAudioSpikeKeepAlive();
  const ctx = getSharedNotificationAudioContext();
  if (!ctx || ctx.state !== "running") {
    logAudio4("keepalive start skipped", { state: ctx?.state ?? null });
    return;
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.frequency.value = 440;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();

  keepAliveOscillator = osc;
  keepAliveGain = gain;
  logAudio4("keepalive start", { audioContextState: ctx.state });
}

async function decodeCustomerReadyBuffer(): Promise<AudioBuffer | null> {
  const ctx = getSharedNotificationAudioContext();
  if (!ctx) return null;

  logAudio4("decode start", { src: AUDIO_ASSETS.CUSTOMER_READY });
  const response = await fetch(AUDIO_ASSETS.CUSTOMER_READY);
  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  logAudio4("decode success", {
    durationSec: buffer.duration,
    sampleRate: buffer.sampleRate,
    numberOfChannels: buffer.numberOfChannels,
  });
  return buffer;
}

/**
 * SPIKE activation — no HTMLAudioElement.play() on CUSTOMER_READY.
 */
export async function prepareCustomerReadyAudioFromGesture(): Promise<{
  audioContextReady: boolean;
  bufferReady: boolean;
}> {
  logAudio4("prepare start");
  lastReadyPlaybackPath = "none";

  const audioContextReady = await ensureNotificationAudioReady();

  try {
    const buffer = await decodeCustomerReadyBuffer();
    cachedReadyAudioBuffer = buffer;
    startCustomerReadyAudioContextKeepAlive();
    logMediaSessionState("after activation prepare");
    return { audioContextReady, bufferReady: buffer !== null };
  } catch (err) {
    logAudio4("decode failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    cachedReadyAudioBuffer = null;
    return { audioContextReady, bufferReady: false };
  }
}

/**
 * SPIKE READY playback — Mixkit samples via AudioBufferSourceNode (not HTML media).
 */
export function playDecodedReadyBuffer(intensity: AlertSoundIntensity): boolean {
  lastReadyPlaybackPath = "playDecodedReadyBuffer";
  logAudio4("buffer playback start", { intensity, path: lastReadyPlaybackPath });

  logMediaSessionState("before buffer playback");

  const ctx = getSharedNotificationAudioContext();
  const buffer = cachedReadyAudioBuffer;

  if (!ctx || !buffer) {
    logAudio4("buffer playback failed", {
      reason: !ctx ? "no_audio_context" : "no_cached_buffer",
    });
    lastReadyPlaybackPath = "none";
    return false;
  }

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }

  if (ctx.state !== "running") {
    logAudio4("buffer playback failed", {
      reason: "audio_context_not_running",
      state: ctx.state,
    });
    lastReadyPlaybackPath = "none";
    return false;
  }

  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = intensity === "high" ? 1 : 0.65;
    source.connect(gain);
    gain.connect(ctx.destination);

    activeBufferSource = source;
    activeBufferGain = gain;

    source.onended = () => {
      logAudio4("buffer playback ended", {
        intensity,
        bufferDurationSec: buffer.duration,
        onendedFired: true,
      });
      cleanupBufferPlaybackNodes(source, gain, "onended");
    };

    source.start(0);
    logMediaSessionState("after buffer playback start");
    return true;
  } catch (err) {
    activeBufferSource = null;
    activeBufferGain = null;
    logAudio4("buffer playback failed", {
      reason: "start_error",
      message: err instanceof Error ? err.message : String(err),
    });
    lastReadyPlaybackPath = "none";
    return false;
  }
}

/** SPIKE-2: record when non-buffer READY paths are used. */
export function recordAudio4ReadyPlaybackPath(path: Audio4ReadyPlaybackPath): void {
  lastReadyPlaybackPath = path;
  if (path === "playCustomerAlertSoundWebAudioFallback") {
    logAudio4("fallback playback used", { path });
  } else if (path === "tryPlayAudioAsset") {
    logAudio4("html audio playback used", { path });
  }
}

/** For tests and reset. */
export function resetCustomerReadyAudioSpike4ForTests(): void {
  stopCustomerReadyAudioSpikeKeepAlive();
  activeBufferSource = null;
  activeBufferGain = null;
  cachedReadyAudioBuffer = null;
  lastReadyPlaybackPath = "none";
}

/** SPIKE-2 test helper — invoke buffer onended handler manually. */
export function fireActiveBufferSourceOnendedForTests(): void {
  if (!activeBufferSource) return;
  activeBufferSource.onended?.(new Event("ended"));
}
