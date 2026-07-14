/**
 * ORDERING-CLIENT-CART-1 — sole owner of cart persistence key format + I/O.
 * Channels never call sessionStorage or assemble keys outside CartScopeAdapter factories.
 */
import type { OrderingCartItem } from "./cartTypes";

/** Default persistence namespace — Client Platform owned. */
export const ORDERING_CART_PERSISTENCE_NAMESPACE = "mineuqr:cart" as const;

export const ORDERING_CART_STORAGE_VERSION = 1 as const;

/**
 * Build opaque scope key from namespace + identity segments.
 * QR table legacy format: `mineuqr:cart:{slug}:{tableNumber}` (unchanged).
 */
export function buildCartPersistenceKey(
  namespace: string,
  segments: readonly string[]
): string {
  const safe = segments.map((s) => String(s).trim()).filter(Boolean);
  return `${namespace}:${safe.join(":")}`;
}

function canUseSessionStorage(): boolean {
  return typeof sessionStorage !== "undefined";
}

export function loadCartByScopeKey(scopeKey: string): OrderingCartItem[] {
  if (!scopeKey || !canUseSessionStorage()) return [];
  try {
    const raw = sessionStorage.getItem(scopeKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderingCartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCartByScopeKey(
  scopeKey: string,
  items: readonly OrderingCartItem[]
): void {
  if (!scopeKey || !canUseSessionStorage()) return;
  try {
    if (items.length === 0) {
      sessionStorage.removeItem(scopeKey);
      return;
    }
    sessionStorage.setItem(scopeKey, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function clearCartByScopeKey(scopeKey: string): void {
  if (!scopeKey || !canUseSessionStorage()) return;
  try {
    sessionStorage.removeItem(scopeKey);
  } catch {
    /* ignore */
  }
}
