/**
 * Arabic script detection for locale-aware formatting (currency, PDF, UI).
 * Platform-neutral — safe for client and server.
 */
const ARABIC_SCRIPT_PATTERN =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabicScript(text: string): boolean {
  return ARABIC_SCRIPT_PATTERN.test(text);
}
