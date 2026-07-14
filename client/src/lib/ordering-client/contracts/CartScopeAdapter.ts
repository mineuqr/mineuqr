/**
 * ORDERING-CLIENT-RUNTIME-1 — channel-independent cart scope contract (ADR-ARCH-018).
 * Channels implement this adapter; the Client Platform never hardcodes QR table identity.
 */
import type { OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";

export type CartScopeDescription = Readonly<{
  slug: string;
  /** Present for QR table carts; optional for future device/session scopes. */
  tableNumber?: number;
}>;

export type CartScopeAdapter = Readonly<{
  channel: OrderingChannelId;
  /** Opaque persistence / isolation key for this cart instance. */
  resolveScopeKey: () => string;
  description: CartScopeDescription;
}>;
