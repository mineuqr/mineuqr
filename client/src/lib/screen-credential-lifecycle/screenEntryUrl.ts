/** Canonical operational screen entry path (SCREEN-CREDENTIAL-LIFECYCLE-1). */
export const SCREEN_ENTRY_PATH = "/screen";

const PRODUCTION_SCREEN_ENTRY_URL = "https://www.mineuqr.com/screen";

/** Device-facing screen entry URL — credentials are stored locally after login. */
export function getScreenEntryUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${SCREEN_ENTRY_PATH}`;
  }
  return PRODUCTION_SCREEN_ENTRY_URL;
}

/** Screen login path when no stored credential exists. */
export function getScreenLoginUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/screen/pair`;
  }
  return "https://www.mineuqr.com/screen/pair";
}
