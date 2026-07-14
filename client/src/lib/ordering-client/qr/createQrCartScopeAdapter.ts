/**
 * ORDERING-CLIENT-RUNTIME-1 — QR CartScopeAdapter (table identity).
 */
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import { cartStorageKey } from "@/lib/cartStorage";
import type { CartScopeAdapter } from "../contracts/CartScopeAdapter";

export function createQrTableCartScopeAdapter(
  slug: string,
  tableNumber: number
): CartScopeAdapter {
  return {
    channel: ORDERING_CHANNEL_QR,
    resolveScopeKey: () => cartStorageKey(slug, tableNumber),
    description: { slug, tableNumber },
  };
}
