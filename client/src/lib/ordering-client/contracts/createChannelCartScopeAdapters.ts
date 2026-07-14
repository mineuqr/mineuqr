/**
 * ORDERING-CLIENT-GOVERNANCE-1 — multi-channel CartScopeAdapter factories (extension points).
 * No UI. Key format always via Client Platform `buildCartPersistenceKey`.
 */
import {
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_WAITER_TABLET,
} from "@shared/ordering-platform/orderingPlatformContracts";
import {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  buildCartPersistenceKey,
} from "../cart/cartPersistence";
import type { CartScopeAdapter } from "./CartScopeAdapter";

/**
 * Kiosk device-session cart scope — isolates cart per kiosk customer session.
 * Persistence key: `mineuqr:cart:{slug}:device:{deviceSessionId}`
 */
export function createKioskDeviceCartScopeAdapter(
  slug: string,
  deviceSessionId: string
): CartScopeAdapter {
  const persistenceNamespace = ORDERING_CART_PERSISTENCE_NAMESPACE;
  return {
    channel: ORDERING_CHANNEL_KIOSK,
    persistenceNamespace,
    description: { slug, deviceSessionId },
    resolveScopeKey: () =>
      buildCartPersistenceKey(persistenceNamespace, [
        slug,
        "device",
        deviceSessionId,
      ]),
  };
}

/**
 * Waiter station cart scope — station + optional table/session identity.
 * Persistence key: `mineuqr:cart:{slug}:station:{stationId}[:table:{n}][:session:{id}]`
 */
export function createWaiterStationCartScopeAdapter(input: {
  slug: string;
  stationId: string;
  tableNumber?: number;
  sessionId?: string;
}): CartScopeAdapter {
  const { slug, stationId, tableNumber, sessionId } = input;
  const persistenceNamespace = ORDERING_CART_PERSISTENCE_NAMESPACE;
  const segments = [slug, "station", stationId];
  if (tableNumber != null && tableNumber > 0) {
    segments.push("table", String(tableNumber));
  }
  if (sessionId) {
    segments.push("session", sessionId);
  }
  return {
    channel: ORDERING_CHANNEL_WAITER_TABLET,
    persistenceNamespace,
    description: { slug, stationId, tableNumber, sessionId },
    resolveScopeKey: () =>
      buildCartPersistenceKey(persistenceNamespace, segments),
  };
}
