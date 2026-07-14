import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import { OrderingBrowseProvider } from "../browse/OrderingBrowseProvider";
import { OrderingCartProvider } from "../cart/OrderingCartProvider";
import { OrderingCheckoutProvider } from "../checkout/OrderingCheckoutProvider";
import { OrderingClientProvider } from "../context/OrderingClientProvider";
import { OrderingClientErrorBoundary } from "../runtime/OrderingClientErrorBoundary";
import { createKioskCartScopeAdapter } from "./createKioskCartScopeAdapter";
import {
  createKioskOrderingNavigator,
  resolveKioskOrderingStage,
} from "./createKioskOrderingNavigator";

export type KioskOrderingClientHostProps = {
  slug: string;
  stationId: string;
  deviceSessionId: string;
  restaurantId?: number;
  kioskId?: string;
  /** Channel query string to preserve across navigator transitions. */
  querySuffix?: string;
  children: ReactNode;
};

/**
 * SELF-ORDERING-KIOSK-PLATFORM-1 — Kiosk shell host.
 * Supplies CartScopeAdapter + OrderingNavigator; Client Platform owns
 * browse / cart / checkout. No duplicated providers.
 */
export function KioskOrderingClientHost({
  slug,
  stationId,
  deviceSessionId,
  restaurantId,
  kioskId,
  querySuffix,
  children,
}: KioskOrderingClientHostProps) {
  const [location, setLocation] = useLocation();
  const cartScope = useMemo(
    () =>
      createKioskCartScopeAdapter({
        slug,
        stationId,
        deviceSessionId,
        restaurantId,
        kioskId,
      }),
    [slug, stationId, deviceSessionId, restaurantId, kioskId]
  );
  const shellStage = resolveKioskOrderingStage(location);
  const navigator = useMemo(
    () =>
      createKioskOrderingNavigator({
        slug,
        stage: shellStage,
        setLocation,
        querySuffix,
      }),
    [slug, shellStage, setLocation, querySuffix]
  );

  if (!slug || !stationId || !deviceSessionId) return null;

  return (
    <OrderingClientErrorBoundary>
      <OrderingClientProvider
        channel={ORDERING_CHANNEL_KIOSK}
        slug={slug}
        cartScope={cartScope}
        navigator={navigator}
      >
        <OrderingBrowseProvider>
          <OrderingCartProvider scope={cartScope}>
            <OrderingCheckoutProvider>{children}</OrderingCheckoutProvider>
          </OrderingCartProvider>
        </OrderingBrowseProvider>
      </OrderingClientProvider>
    </OrderingClientErrorBoundary>
  );
}
