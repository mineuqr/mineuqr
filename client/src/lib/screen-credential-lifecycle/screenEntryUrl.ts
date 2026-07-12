/** Canonical operational screen entry path (SCREEN-CREDENTIAL-LIFECYCLE-1). */
export const SCREEN_ENTRY_PATH = "/screen";

const PRODUCTION_SCREEN_ENTRY_URL = "https://www.mineuqr.com/screen";

/** Device-facing screen entry URL — runtime decides pairing vs active session. */
export function getScreenEntryUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${SCREEN_ENTRY_PATH}`;
  }
  return PRODUCTION_SCREEN_ENTRY_URL;
}

/** @deprecated Use getScreenEntryUrl — /screen is the sole public entry point (SCREEN-PAIRING-CODE-1). */
export function getScreenLoginUrl(): string {
  return getScreenEntryUrl();
}
