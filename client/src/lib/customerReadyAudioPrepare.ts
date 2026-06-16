/**
 * AUDIO-ENABLE-UX-1 — explicit user-gesture audio prep for later READY playback.
 * No notification permission, push enrollment, or READY alert delivery.
 */

import { unlockCustomerReadyAudioFromGesture } from "@/lib/notificationSound";

export const CUSTOMER_READY_AUDIO_PREPARE_BUILD = "AUDIO-ENABLE-UX-1";

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
 * Prepare HTML Audio + Web Audio during an explicit button tap.
 * Calls unlockCustomerReadyAudioFromGesture() only — no READY playback.
 */
export async function prepareCustomerReadyAudioFromUserGesture(): Promise<boolean> {
  if (prepared) return true;
  if (prepareInFlight) return false;

  prepareInFlight = true;
  try {
    const ready = await unlockCustomerReadyAudioFromGesture();
    if (ready) {
      prepared = true;
    }
    return ready;
  } finally {
    prepareInFlight = false;
  }
}
