/**
 * AUDIO-HOTFIX-4-SPIKE-1 — prototype only (decode + keep-alive + buffer playback).
 * Enable: ?audio4=1 on tracking URL or sessionStorage mineuqr:audio4:spike=1
 * Default production path remains HOTFIX-3A until spike PASS.
 */

import { AUDIO_ASSETS } from "@/lib/audioAssets";
import {
  ensureNotificationAudioReady,
  getSharedNotificationAudioContext,
  type AlertSoundIntensity,
} from "@/lib/notificationSound";

export const AUDIO4_SPIKE_BUILD = "AUDIO-HOTFIX-4-SPIKE-1";

let cachedReadyAudioBuffer: AudioBuffer | null = null;
let keepAliveOscillator: OscillatorNode | null = null;
let keepAliveGain: GainNode | null = null;

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

export function getCachedReadyAudioBufferForSpike(): AudioBuffer | null {
  return cachedReadyAudioBuffer;
}

export function isCustomerReadyAudioSpikeKeepAliveActive(): boolean {
  return keepAliveOscillator !== null;
}

export function stopCustomerReadyAudioSpikeKeepAlive(): void {
  try {
    keepAliveOscillator?.stop();
  } catch {
    /* already stopped */
  }
  keepAliveOscillator = null;
  keepAliveGain = null;
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

  const audioContextReady = await ensureNotificationAudioReady();

  try {
    const buffer = await decodeCustomerReadyBuffer();
    cachedReadyAudioBuffer = buffer;
    startCustomerReadyAudioContextKeepAlive();
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
  logAudio4("buffer playback start", { intensity });

  const ctx = getSharedNotificationAudioContext();
  const buffer = cachedReadyAudioBuffer;

  if (!ctx || !buffer) {
    logAudio4("buffer playback failed", {
      reason: !ctx ? "no_audio_context" : "no_cached_buffer",
    });
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
    return false;
  }

  try {
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = intensity === "high" ? 1 : 0.65;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return true;
  } catch (err) {
    logAudio4("buffer playback failed", {
      reason: "start_error",
      message: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** For tests and reset. */
export function resetCustomerReadyAudioSpike4ForTests(): void {
  stopCustomerReadyAudioSpikeKeepAlive();
  cachedReadyAudioBuffer = null;
}
