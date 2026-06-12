/** CUSTOMER-UX-1C — Web Audio alerts (customer + owner patterns). */

export type AlertSoundIntensity = "high" | "medium";

/** Documented pattern lengths for tests and tuning (AUDIO-TUNE-1). */
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

function scheduleTones(audioCtx: AudioContext, intensity: AlertSoundIntensity): void {
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

/**
 * Customer ready alert — high = Alert #1, medium = Alert #2.
 * Returns true only when AudioContext is running (audible playback possible).
 */
export function playCustomerAlertSound(intensity: AlertSoundIntensity): boolean {
  try {
    const audioCtx = sharedAudioContext;
    if (!audioCtx || audioCtx.state !== "running") {
      return false;
    }
    scheduleTones(audioCtx, intensity);
    return true;
  } catch {
    return false;
  }
}

/** Owner dashboard chime — preserved for OrderAlertSystem parity. */
export function playOwnerNotificationSound(): boolean {
  return playCustomerAlertSound("high");
}

/** For tests — reset shared audio context between cases. */
export function resetNotificationAudioForTests(): void {
  sharedAudioContext = null;
}
