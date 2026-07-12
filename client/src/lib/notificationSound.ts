/**
 * NOTIFICATION-AUDIO-1 — notification sound playback.
 * Primary: HTML Audio assets. Fallback: Web Audio synthesized tones.
 */

import { AUDIO_ASSETS } from "@/lib/audioAssets";
import {
  clearNotificationMediaSession,
  NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD,
} from "@/lib/notificationMediaSession";
import {
  isAudio4SpikeEnabled,
  logAudio4,
  playDecodedReadyBuffer,
  recordAudio4ReadyPlaybackPath,
  resetCustomerReadyAudioSpike4ForTests,
} from "@/lib/customerReadyAudioSpike4";

export type AlertSoundIntensity = "high" | "medium";

/** Documented pattern lengths for Web Audio fallback (AUDIO-TUNE-1). */
export const CUSTOMER_ALERT_PATTERN = {
  high: {
    beep1Ms: 120,
    pauseMs: 120,
    beep2Ms: 220,
    totalMs: 460,
  },
  medium: {
    beep1Ms: 90,
    pauseMs: 140,
    beep2Ms: 160,
    totalMs: 390,
  },
} as const;

let sharedAudioContext: AudioContext | null = null;
const assetAudioCache = new Map<string, HTMLAudioElement>();
let ownerAlertAudioPrimed = false;
let customerReadyHtmlCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let customerReadyWebAudioCleanupTimer: ReturnType<typeof setTimeout> | null = null;

/** Temporary verification fingerprint — search prod bundle for this string. */
export const AUDIO_TRACE_BUILD = "NOTIFICATION-AUDIO-CLEANUP-1";

function isAudioTraceEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("audioTrace")) return true;
    return sessionStorage.getItem("mineuqr:audio:trace") === "1";
  } catch {
    return false;
  }
}

function logAudioTrace(message: string, metadata?: Record<string, unknown>): void {
  if (!isAudioTraceEnabled()) return;
  if (metadata) {
    console.info(`[mineuqr:audio] ${message}`, metadata);
  } else {
    console.info(`[mineuqr:audio] ${message}`);
  }
}

function clearCustomerReadyPlaybackTimers(): void {
  if (customerReadyHtmlCleanupTimer !== null) {
    clearTimeout(customerReadyHtmlCleanupTimer);
    customerReadyHtmlCleanupTimer = null;
  }
  if (customerReadyWebAudioCleanupTimer !== null) {
    clearTimeout(customerReadyWebAudioCleanupTimer);
    customerReadyWebAudioCleanupTimer = null;
  }
}

/**
 * NOTIFICATION-AUDIO-CLEANUP-1 — release HTML media element + dismiss iOS Now Playing.
 * Restores `src` on the cached element so the next READY alert can replay the asset.
 */
export function releaseCustomerReadyHtmlAudioElement(
  audio: HTMLAudioElement,
  assetSrc: string,
  reason: string
): void {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
    audio.src = assetSrc;
  } catch {
    /* best-effort */
  }
  clearNotificationMediaSession(reason);
  logAudioTrace("customer ready html released", {
    build: NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD,
    reason,
    src: assetSrc,
  });
}

function scheduleCustomerReadyHtmlPlaybackCleanup(
  audio: HTMLAudioElement,
  assetSrc: string,
  durationSec: number
): void {
  clearCustomerReadyPlaybackTimers();

  const onEnded = () => {
    if (customerReadyHtmlCleanupTimer !== null) {
      clearTimeout(customerReadyHtmlCleanupTimer);
      customerReadyHtmlCleanupTimer = null;
    }
    releaseCustomerReadyHtmlAudioElement(audio, assetSrc, "html_ended");
  };

  if (typeof audio.addEventListener === "function") {
    audio.addEventListener("ended", onEnded, { once: true });
  }

  // Fallback when `ended` does not fire (iOS edge cases, interrupted playback).
  const fallbackMs = Math.max(500, Math.ceil(durationSec * 1000) + 250);
  customerReadyHtmlCleanupTimer = setTimeout(() => {
    customerReadyHtmlCleanupTimer = null;
    if (!audio.paused && audio.currentTime > 0) {
      releaseCustomerReadyHtmlAudioElement(audio, assetSrc, "html_timeout");
    } else if (audio.ended || audio.currentTime >= durationSec - 0.05) {
      releaseCustomerReadyHtmlAudioElement(audio, assetSrc, "html_timeout_ended");
    }
  }, fallbackMs);
}

function scheduleCustomerReadyWebAudioCleanup(intensity: AlertSoundIntensity): void {
  if (customerReadyWebAudioCleanupTimer !== null) {
    clearTimeout(customerReadyWebAudioCleanupTimer);
  }
  const cleanupMs = CUSTOMER_ALERT_PATTERN[intensity].totalMs + 200;
  customerReadyWebAudioCleanupTimer = setTimeout(() => {
    customerReadyWebAudioCleanupTimer = null;
    clearNotificationMediaSession("web_audio_fallback");
    logAudioTrace("customer ready web audio cleanup", {
      build: NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD,
      intensity,
    });
  }, cleanupMs);
}

function ensureHtmlAudioSrc(audio: HTMLAudioElement, src: string): void {
  if (!audio.src || !audio.src.endsWith(src)) {
    audio.src = src;
  }
}

function getCachedAudioElement(src: string): HTMLAudioElement | null {
  if (typeof window === "undefined" || typeof Audio === "undefined") {
    return null;
  }
  let audio = assetAudioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    assetAudioCache.set(src, audio);
  }
  return audio;
}

function logAudioUnlockSuccess(src: string): void {
  logAudioTrace("unlock success", { src, build: AUDIO_TRACE_BUILD });
}

function logAudioUnlockFailed(src: string, err: unknown): void {
  logAudioTrace("unlock failed", {
    src,
    build: AUDIO_TRACE_BUILD,
    name: err instanceof DOMException ? err.name : err instanceof Error ? err.name : "unknown",
    message: err instanceof Error ? err.message : String(err),
  });
}

function logAudioContextSuspended(): void {
  logAudioTrace("audio context suspended", {
    build: AUDIO_TRACE_BUILD,
    state: sharedAudioContext?.state ?? null,
  });
}

function logAudioPlayRejection(audio: HTMLAudioElement, src: string, err: unknown): void {
  logAudioTrace("play rejected", {
    build: AUDIO_TRACE_BUILD,
    name: err instanceof DOMException ? err.name : err instanceof Error ? err.name : "unknown",
    message: err instanceof Error ? err.message : String(err),
    src,
    readyState: audio.readyState,
    networkState: audio.networkState,
    mediaError: audio.error?.code ?? null,
  });
}

export function isOwnerAlertAudioPrimed(): boolean {
  return ownerAlertAudioPrimed;
}

function getAudioContextClass(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext ||
    null
  );
}

export function getNotificationAudioContextState(): AudioContextState | null {
  return sharedAudioContext?.state ?? null;
}

/** SPIKE-4 only — read shared AudioContext after ensureNotificationAudioReady(). */
export function getSharedNotificationAudioContext(): AudioContext | null {
  return sharedAudioContext;
}

/** SPIKE-2: log whether a cached CUSTOMER_READY HTML element exists or is playing during READY. */
export function auditCustomerReadyHtmlAudioForSpike(): void {
  if (!isAudio4SpikeEnabled()) return;
  const audio = assetAudioCache.get(AUDIO_ASSETS.CUSTOMER_READY);
  logAudio4("html audio audit", {
    cachedElementExists: Boolean(audio),
    paused: audio?.paused ?? null,
    currentTime: audio?.currentTime ?? null,
    muted: audio?.muted ?? null,
    volume: audio?.volume ?? null,
    readyState: audio?.readyState ?? null,
  });
}

/** Unlock audio from a user gesture — awaits resume before reporting readiness. */
export async function ensureNotificationAudioReady(): Promise<boolean> {
  try {
    const Ctx = getAudioContextClass();
    if (!Ctx) return false;
    if (!sharedAudioContext) {
      sharedAudioContext = new Ctx();
    }
    if (sharedAudioContext.state === "suspended") {
      await sharedAudioContext.resume();
    }
    return sharedAudioContext.state === "running";
  } catch {
    return false;
  }
}

/** @deprecated Prefer ensureNotificationAudioReady from a user gesture. */
export function unlockNotificationAudio(): void {
  void ensureNotificationAudioReady();
}

/**
 * AUDIO-HOTFIX-3A — silent muted play/pause on the cached element (iOS delayed-play unlock).
 * Does not change volume; does not play audibly; avoids HOTFIX-2A media session behavior.
 */
async function unlockHtmlAudioElementSilently(audio: HTMLAudioElement): Promise<boolean> {
  const prevMuted = audio.muted;
  const prevVolume = audio.volume;

  logAudioTrace("unlock start", {
    build: AUDIO_TRACE_BUILD,
    fn: "unlockHtmlAudioElementSilently",
    src: audio.src || null,
    prevMuted,
    prevVolume,
  });

  try {
    audio.muted = true;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    logAudioUnlockSuccess(audio.src);
    return true;
  } catch (err) {
    logAudioUnlockFailed(audio.src, err);
    return false;
  } finally {
    audio.muted = prevMuted;
    audio.volume = prevVolume;
    clearNotificationMediaSession("html_unlock");
  }
}

/**
 * AUDIO-HOTFIX-3A — gesture-time Web Audio + HTML unlock helper.
 * NOT used during notification enrollment (NOTIFICATION-AUDIO-CLEANUP-1).
 * Reserved for explicit call sites that need iOS delayed-play priming outside activation.
 */
export async function unlockCustomerReadyAudioFromGesture(): Promise<boolean> {
  logAudioTrace("unlock start", {
    build: AUDIO_TRACE_BUILD,
    fn: "unlockCustomerReadyAudioFromGesture",
  });

  const ctxReady = await ensureNotificationAudioReady();
  const audio = getCachedAudioElement(AUDIO_ASSETS.CUSTOMER_READY);
  const htmlReady = audio ? await unlockHtmlAudioElementSilently(audio) : false;

  if (!ctxReady && sharedAudioContext?.state === "suspended") {
    logAudioContextSuspended();
  }

  return ctxReady || htmlReady;
}

/**
 * OWNER-GLOBAL-1A: prime OWNER_ALERT HTML Audio during dashboard user gesture.
 */
export async function primeOwnerAlertAudioAsset(): Promise<boolean> {
  const audio = getCachedAudioElement(AUDIO_ASSETS.OWNER_ALERT);
  if (!audio) return false;

  try {
    const restoredVolume = audio.volume > 0 ? audio.volume : 1;
    audio.volume = 0.001;
    audio.currentTime = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = restoredVolume;
    ownerAlertAudioPrimed = true;
    return true;
  } catch {
    return false;
  }
}

/** Unlock shared Web Audio + prime owner WAV from an explicit dashboard gesture. */
export async function primeOwnerDashboardAudioFromGesture(): Promise<{
  audioContextReady: boolean;
  htmlAudioPrimed: boolean;
}> {
  const audioContextReady = await ensureNotificationAudioReady();
  const htmlAudioPrimed = await primeOwnerAlertAudioAsset();
  return { audioContextReady, htmlAudioPrimed };
}

/** Try HTML Audio asset playback (preferred). Invokes onPlayRejected when play() rejects. */
function tryPlayAudioAsset(
  src: string,
  volume: number,
  onPlayRejected: () => void
): boolean {
  const audio = getCachedAudioElement(src);
  if (!audio) return false;

  if (isAudio4SpikeEnabled() && src === AUDIO_ASSETS.CUSTOMER_READY) {
    recordAudio4ReadyPlaybackPath("tryPlayAudioAsset");
  }

  try {
    ensureHtmlAudioSrc(audio, src);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;

    if (src === AUDIO_ASSETS.CUSTOMER_READY) {
      const durationSec =
        Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 5.5;
      scheduleCustomerReadyHtmlPlaybackCleanup(audio, src, durationSec);
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      void playPromise.catch((err) => {
        logAudioPlayRejection(audio, src, err);
        onPlayRejected();
      });
    }
    return true;
  } catch {
    return false;
  }
}

type BeepSpec = {
  frequencyHz: number;
  startSec: number;
  durationSec: number;
  peakGain: number;
};

function playBeep(audioCtx: AudioContext, spec: BeepSpec): void {
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  osc.frequency.value = spec.frequencyHz;
  osc.type = "sine";

  const start = audioCtx.currentTime + spec.startSec;
  const attackSec = 0.01;
  const releaseSec = Math.min(0.05, spec.durationSec * 0.18);
  const sustainUntil = start + spec.durationSec - releaseSec;

  gainNode.gain.setValueAtTime(0.001, start);
  gainNode.gain.exponentialRampToValueAtTime(spec.peakGain, start + attackSec);
  gainNode.gain.setValueAtTime(spec.peakGain, sustainUntil);
  gainNode.gain.exponentialRampToValueAtTime(0.001, start + spec.durationSec);

  osc.start(start);
  osc.stop(start + spec.durationSec + 0.03);
}

function playCustomerAlertSoundWebAudioFallback(intensity: AlertSoundIntensity): boolean {
  if (isAudio4SpikeEnabled()) {
    recordAudio4ReadyPlaybackPath("playCustomerAlertSoundWebAudioFallback");
  }
  try {
    const audioCtx = sharedAudioContext;
    if (!audioCtx || audioCtx.state !== "running") {
      logAudioContextSuspended();
      return false;
    }
    scheduleCustomerFallbackTones(audioCtx, intensity);
    scheduleCustomerReadyWebAudioCleanup(intensity);
    return true;
  } catch {
    return false;
  }
}

function scheduleCustomerFallbackTones(audioCtx: AudioContext, intensity: AlertSoundIntensity): void {
  if (intensity === "high") {
    const { beep1Ms, pauseMs, beep2Ms } = CUSTOMER_ALERT_PATTERN.high;
    const beep1Sec = beep1Ms / 1000;
    const pauseSec = pauseMs / 1000;
    const beep2Sec = beep2Ms / 1000;

    playBeep(audioCtx, {
      frequencyHz: 880,
      startSec: 0,
      durationSec: beep1Sec,
      peakGain: 0.46,
    });
    playBeep(audioCtx, {
      frequencyHz: 1175,
      startSec: beep1Sec + pauseSec,
      durationSec: beep2Sec,
      peakGain: 0.5,
    });
    return;
  }

  const { beep1Ms, pauseMs, beep2Ms } = CUSTOMER_ALERT_PATTERN.medium;
  const beep1Sec = beep1Ms / 1000;
  const pauseSec = pauseMs / 1000;
  const beep2Sec = beep2Ms / 1000;

  playBeep(audioCtx, {
    frequencyHz: 784,
    startSec: 0,
    durationSec: beep1Sec,
    peakGain: 0.28,
  });
  playBeep(audioCtx, {
    frequencyHz: 880,
    startSec: beep1Sec + pauseSec,
    durationSec: beep2Sec,
    peakGain: 0.3,
  });
}

/** Web Audio fallback — owner triple-tone chime using shared unlocked context. */
function playOwnerAlertSoundWebAudioFallback(): boolean {
  try {
    const audioCtx = sharedAudioContext;
    if (!audioCtx || audioCtx.state !== "running") {
      return false;
    }

    const playTone = (
      frequency: number,
      startOffset: number,
      duration: number,
      peakGain: number
    ) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      const start = audioCtx.currentTime + startOffset;
      gain.gain.setValueAtTime(peakGain, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    };

    playTone(880, 0, 0.4, 0.4);
    playTone(1100, 0.15, 0.45, 0.4);
    playTone(1320, 0.3, 0.5, 0.35);
    return true;
  } catch {
    return false;
  }
}

/**
 * Customer READY alert — single tier-1 (high) delivery.
 * Uses mixkit-clock-countdown-bleeps; Web Audio fallback if asset unavailable.
 * AUDIO-HOTFIX-4-SPIKE-1: when ?audio4=1, buffer playback replaces HTML path.
 */
export function playCustomerAlertSound(intensity: AlertSoundIntensity): boolean {
  if (isAudio4SpikeEnabled()) {
    auditCustomerReadyHtmlAudioForSpike();
    if (playDecodedReadyBuffer(intensity)) {
      return true;
    }
    const fallbackPlayed = playCustomerAlertSoundWebAudioFallback(intensity);
    auditCustomerReadyHtmlAudioForSpike();
    return fallbackPlayed;
  }

  logAudioTrace("ready playback start", {
    build: AUDIO_TRACE_BUILD,
    fn: "playCustomerAlertSound",
    intensity,
    audioContextState: sharedAudioContext?.state ?? null,
  });

  const volume = intensity === "high" ? 1 : 0.65;
  const fallback = () => playCustomerAlertSoundWebAudioFallback(intensity);
  if (tryPlayAudioAsset(AUDIO_ASSETS.CUSTOMER_READY, volume, fallback)) {
    return true;
  }
  return fallback();
}

/** Owner operational alert — new orders, service requests, etc. */
export function playOwnerNotificationSound(): boolean {
  const fallback = () => playOwnerAlertSoundWebAudioFallback();
  if (tryPlayAudioAsset(AUDIO_ASSETS.OWNER_ALERT, 1, fallback)) {
    return true;
  }
  return fallback();
}

/** KITCHEN-NOTIFICATION-ARCHITECTURE-1 — single kitchen operational alert (new pending order). */
export function playKitchenOrderArrivalSound(): boolean {
  return playOwnerNotificationSound();
}

/** For tests — reset shared audio state between cases. */
export function resetNotificationAudioForTests(): void {
  clearCustomerReadyPlaybackTimers();
  sharedAudioContext = null;
  assetAudioCache.clear();
  ownerAlertAudioPrimed = false;
  resetCustomerReadyAudioSpike4ForTests();
}
