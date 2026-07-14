/**
 * ORDERING-CLIENT-CART-1 / GOVERNANCE-1 — channel-independent cart scope contract (ADR-ARCH-018).
 * Channels supply identity + namespace; Client Platform owns persistence and orchestration.
 *
 * Extension points (additive, non-breaking) for future channels:
 * - QR: slug + tableNumber
 * - Kiosk: slug + deviceSessionId (session isolation / auto-reset)
 * - Waiter: slug + stationId + optional tableNumber / sessionId
 */
import type { OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";

export type CartScopeDescription = Readonly<{
  /** Restaurant public slug (all channels). */
  slug: string;
  /** Table number when ordering is table-scoped (QR / waiter table workspace). */
  tableNumber?: number;
  /** Dining / guest session token when cart is session-scoped. */
  sessionId?: string;
  /** Kiosk device customer-session isolation key (cleared on kiosk reset). */
  deviceSessionId?: string;
  /** Waiter station / workspace identity. */
  stationId?: string;
  /** Optional restaurant numeric id (channel metadata; not required for key). */
  restaurantId?: number;
  /** Optional physical kiosk device identifier. */
  kioskId?: string;
  /**
   * Optional extra opaque segments appended by channel factories via
   * `buildCartPersistenceKey` — never assembled ad-hoc outside Client Platform.
   */
  extraKeySegments?: readonly string[];
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
