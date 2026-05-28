const STORAGE_KEY = "mineuqr_correlation_id";

function canUseSessionStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
  } catch {
    return false;
  }
}

function generateId(): string {
  // Best effort: modern browsers support randomUUID.
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // Fallback: timestamp + random (still fine for correlation).
  return `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** Stable per-tab/session correlation id for outbound requests. */
export function getClientCorrelationId(): string {
  if (!canUseSessionStorage()) return generateId();

  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing && existing.length > 0) return existing;

  const next = generateId();
  window.sessionStorage.setItem(STORAGE_KEY, next);
  return next;
}

