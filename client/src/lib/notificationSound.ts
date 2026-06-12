/** CUSTOMER-UX-1C — Web Audio alerts (customer + owner patterns). */

export type AlertSoundIntensity = "high" | "medium";

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

function scheduleTones(audioCtx: AudioContext, intensity: AlertSoundIntensity): void {
  const peakGain = intensity === "high" ? 0.55 : 0.32;
  const toneDuration = intensity === "high" ? 0.45 : 0.32;

  const playTone = (frequency: number, startOffset: number, gain: number) => {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.frequency.value = frequency;
    osc.type = "sine";
    const start = audioCtx.currentTime + startOffset;
    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.01, start + toneDuration);
    osc.start(start);
    osc.stop(start + toneDuration + 0.05);
  };

  if (intensity === "high") {
    playTone(880, 0, peakGain);
    playTone(1100, 0.12, peakGain);
    playTone(1320, 0.24, peakGain * 0.9);
  } else {
    playTone(980, 0, peakGain);
    playTone(1180, 0.1, peakGain * 0.85);
  }
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
