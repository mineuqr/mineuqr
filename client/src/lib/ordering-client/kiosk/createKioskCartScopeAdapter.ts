/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — Kiosk CartScopeAdapter factory.
 * Channel supplies identity; Client Platform owns persistence I/O.
 *
 * Key: `mineuqr:cart:{slug}:station:{stationId}:device:{deviceSessionId}`
 */
import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import type { CartScopeAdapter } from "../contracts/CartScopeAdapter";
import {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  buildCartPersistenceKey,
} from "../cart/cartPersistence";

export type CreateKioskCartScopeAdapterInput = Readonly<{
  slug: string;
  stationId: string;
  deviceSessionId: string;
  /** Optional restaurant id for channel metadata (not part of persistence key). */
  restaurantId?: number;
  /** Optional kiosk device identifier for channel metadata. */
  kioskId?: string;
}>;

export function createKioskCartScopeAdapter(
  input: CreateKioskCartScopeAdapterInput
): CartScopeAdapter {
  const { slug, stationId, deviceSessionId, restaurantId, kioskId } = input;
  const persistenceNamespace = ORDERING_CART_PERSISTENCE_NAMESPACE;
  const extra = kioskId ? ([kioskId] as const) : undefined;

  return {
    channel: ORDERING_CHANNEL_KIOSK,
    persistenceNamespace,
    description: {
      slug,
      stationId,
      deviceSessionId,
      restaurantId,
      kioskId,
      extraKeySegments: extra,
    },
    resolveScopeKey: () =>
      buildCartPersistenceKey(persistenceNamespace, [
        slug,
        "station",
        stationId,
        "device",
        deviceSessionId,
        ...(extra ?? []),
      ]),
  };
}
