/**
 * ORDERING-CLIENT-CART-1 — QR CartScopeAdapter (table identity only).
 * Persistence key format is owned by Client Platform key builder.
 */
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import type { CartScopeAdapter } from "../contracts/CartScopeAdapter";
import {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  buildCartPersistenceKey,
} from "../cart/cartPersistence";

export function createQrTableCartScopeAdapter(
  slug: string,
  tableNumber: number
): CartScopeAdapter {
  const persistenceNamespace = ORDERING_CART_PERSISTENCE_NAMESPACE;
  return {
    channel: ORDERING_CHANNEL_QR,
    persistenceNamespace,
    description: { slug, tableNumber },
    resolveScopeKey: () =>
      buildCartPersistenceKey(persistenceNamespace, [slug, String(tableNumber)]),
  };
}
