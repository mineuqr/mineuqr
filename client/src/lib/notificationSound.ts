/**
 * NOTIFICATION-AUDIO-1 — notification sound playback.
 * Primary: HTML Audio assets. Fallback: Web Audio synthesized tones.
 */

import { AUDIO_ASSETS } from "@/lib/audioAssets";

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

function logAudioPlayRejection(audio: HTMLAudioElement, src: string, err: unknown): void {
  if (!import.meta.env.DEV) return;
  console.info("[mineuqr:audio] play rejected", {
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

  try {
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;
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
  try {
    const audioCtx = sharedAudioContext;
    if (!audioCtx || audioCtx.state !== "running") {
      return false;
    }
    scheduleCustomerFallbackTones(audioCtx, intensity);
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
 * Customer READY alert — tier 1 (high) and tier 2 (medium) reminder.
 * Uses mixkit-clock-countdown-bleeps; Web Audio fallback if asset unavailable.
 */
export function playCustomerAlertSound(intensity: AlertSoundIntensity): boolean {
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

/** For tests — reset shared audio state between cases. */
export function resetNotificationAudioForTests(): void {
  sharedAudioContext = null;
  assetAudioCache.clear();
  ownerAlertAudioPrimed = false;
}
