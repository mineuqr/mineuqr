/**
 * NOTIFICATION-AUDIO-CLEANUP-1 — dismiss iOS lock-screen Now Playing after alert sounds.
 */

export const NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD = "NOTIFICATION-AUDIO-CLEANUP-1";

function isMediaSessionTraceEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).has("audioTrace")) return true;
    return sessionStorage.getItem("mineuqr:audio:trace") === "1";
  } catch {
    return false;
  }
}

function logMediaSessionCleanup(message: string, metadata?: Record<string, unknown>): void {
  if (!isMediaSessionTraceEnabled()) return;
  if (metadata) {
    console.info(`[mineuqr:audio] ${message}`, {
      build: NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD,
      ...metadata,
    });
  } else {
    console.info(`[mineuqr:audio] ${message}`, {
      build: NOTIFICATION_MEDIA_SESSION_CLEANUP_BUILD,
    });
  }
}

/** Clear active Now Playing / lock-screen media controls. Safe no-op when unsupported. */
export function clearNotificationMediaSession(reason: string): void {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    logMediaSessionCleanup("media session clear skipped", { reason, supported: false });
    return;
  }

  const ms = navigator.mediaSession;
  const beforeState = ms.playbackState;
  const beforeTitle = ms.metadata?.title ?? null;

  try {
    ms.playbackState = "none";
    ms.metadata = null;
    ms.setActionHandler?.("play", null);
    ms.setActionHandler?.("pause", null);
    ms.setActionHandler?.("seekbackward", null);
    ms.setActionHandler?.("seekforward", null);
    ms.setActionHandler?.("seekto", null);
    ms.setActionHandler?.("stop", null);
    logMediaSessionCleanup("media session cleared", {
      reason,
      beforeState,
      beforeTitle,
      afterState: ms.playbackState,
    });
  } catch (err) {
    logMediaSessionCleanup("media session clear failed", {
      reason,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
