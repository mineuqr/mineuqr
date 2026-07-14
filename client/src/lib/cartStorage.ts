/**
 * ORDERING-CLIENT-CART-1 — legacy persistence helpers.
 * New code must use CartScopeAdapter + cartPersistence via Ordering Client Platform.
 * These wrappers preserve the historical QR table key format for any leftover callers.
 */
import type { OrderingCartItem } from "@/lib/ordering-client/cart/cartTypes";
import {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  buildCartPersistenceKey,
  clearCartByScopeKey,
  loadCartByScopeKey,
  saveCartByScopeKey,
} from "@/lib/ordering-client/cart/cartPersistence";

/** @deprecated Use CartScopeAdapter.resolveScopeKey via createQrTableCartScopeAdapter. */
export function cartStorageKey(slug: string, tableNumber: number): string {
  return buildCartPersistenceKey(ORDERING_CART_PERSISTENCE_NAMESPACE, [
    slug,
    String(tableNumber),
  ]);
}

/** @deprecated Use loadCartByScopeKey(adapter.resolveScopeKey()). */
export function loadScopedCart(
  slug: string,
  tableNumber: number
): OrderingCartItem[] {
  if (!slug || tableNumber <= 0) return [];
  return loadCartByScopeKey(cartStorageKey(slug, tableNumber));
}

/** @deprecated Use saveCartByScopeKey(adapter.resolveScopeKey(), items). */
export function saveScopedCart(
  slug: string,
  tableNumber: number,
  items: OrderingCartItem[]
): void {
  if (!slug || tableNumber <= 0) return;
  saveCartByScopeKey(cartStorageKey(slug, tableNumber), items);
}

/** @deprecated Use clearCartByScopeKey(adapter.resolveScopeKey()). */
export function clearScopedCart(slug: string, tableNumber: number): void {
  if (!slug || tableNumber <= 0) return;
  clearCartByScopeKey(cartStorageKey(slug, tableNumber));
}
