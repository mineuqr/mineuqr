import type { CartItem } from "@/contexts/CartContext";

const PREFIX = "mineuqr:cart:";

export function cartStorageKey(slug: string, tableNumber: number): string {
  return `${PREFIX}${slug}:${tableNumber}`;
}

export function loadScopedCart(slug: string, tableNumber: number): CartItem[] {
  if (!slug || tableNumber <= 0 || typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(cartStorageKey(slug, tableNumber));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScopedCart(slug: string, tableNumber: number, items: CartItem[]): void {
  if (!slug || tableNumber <= 0 || typeof sessionStorage === "undefined") return;
  try {
    if (items.length === 0) {
      sessionStorage.removeItem(cartStorageKey(slug, tableNumber));
      return;
    }
    sessionStorage.setItem(cartStorageKey(slug, tableNumber), JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function clearScopedCart(slug: string, tableNumber: number): void {
  if (!slug || tableNumber <= 0 || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(cartStorageKey(slug, tableNumber));
  } catch {
    /* ignore */
  }
}
