/**
 * ORDERING-CLIENT-CART-1 — channel-independent cart scope contract (ADR-ARCH-018).
 * Channels supply identity + namespace; Client Platform owns persistence and orchestration.
 */
import type { OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";

export type CartScopeDescription = Readonly<{
  /** Restaurant public slug (QR table carts). */
  slug: string;
  /** Table number when ordering is table-scoped. */
  tableNumber?: number;
  /** Optional dining/session token for future channels. */
  sessionId?: string;
}>;

export type CartScopeAdapter = Readonly<{
  channel: OrderingChannelId;
  /**
   * Persistence namespace prefix (default owned by Client Platform).
   * Combined with identity segments inside resolveScopeKey / platform key builder.
   */
  persistenceNamespace: string;
  description: CartScopeDescription;
  /** Opaque persistence key — produced via Client Platform key builder only. */
  resolveScopeKey: () => string;
}>;
