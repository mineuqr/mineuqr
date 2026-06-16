/**
 * READY-AUDIO-RECOVERY-1 — silent one-time audio prep on first natural page interaction.
 * No UI, permission, or push enrollment.
 */

import { unlockCustomerReadyAudioFromGesture } from "@/lib/notificationSound";

export const CUSTOMER_READY_AUDIO_PREPARE_BUILD = "READY-AUDIO-RECOVERY-1";

let prepared = false;
let prepareInFlight = false;

export function isCustomerReadyAudioPrepared(): boolean {
  return prepared;
}

export function resetCustomerReadyAudioPrepareForTests(): void {
  prepared = false;
  prepareInFlight = false;
}

/**
 * Attach listeners for the first user gesture on the tracking page.
 * Unlocks HTML Audio (muted) + Web Audio context for later poll-time READY playback.
 */
export function attachCustomerReadyAudioPrepareOnFirstGesture(): () => void {
  if (typeof window === "undefined" || prepared || prepareInFlight) {
    return () => undefined;
  }

  const runPrepare = () => {
    if (prepared || prepareInFlight) return;
    prepareInFlight = true;
    detach();

    void unlockCustomerReadyAudioFromGesture().then((ready) => {
      prepareInFlight = false;
      if (ready) {
        prepared = true;
      }
    });
  };

  const detach = () => {
    window.removeEventListener("pointerdown", runPrepare, true);
    window.removeEventListener("touchstart", runPrepare, true);
  };

  window.addEventListener("pointerdown", runPrepare, { capture: true, passive: true });
  window.addEventListener("touchstart", runPrepare, { capture: true, passive: true });

  return detach;
}
