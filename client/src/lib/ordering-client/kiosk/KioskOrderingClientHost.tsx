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
  /**
   * KIOSK-SCREEN-ACTIVATION-1 — Screen Runtime host stage controller.
   * When set, navigator updates host state instead of `/kiosk` URLs.
   */
  onHostStageNavigate?: (
    stage: import("./createKioskOrderingNavigator").KioskShellStage,
    extras?: { trackingToken?: string }
  ) => void;
  /** Hosted shell stage — used when onHostStageNavigate is active. */
  hostStage?: import("./createKioskOrderingNavigator").KioskShellStage;
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
  onHostStageNavigate,
  hostStage,
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
  const shellStage =
    onHostStageNavigate && hostStage
      ? hostStage === "resetting"
        ? "idle"
        : hostStage
      : resolveKioskOrderingStage(location);
  const navigator = useMemo(
    () =>
      createKioskOrderingNavigator({
        slug,
        stage: shellStage === "confirmation" ? "confirmation" : shellStage,
        setLocation,
        querySuffix,
        onHostStageNavigate,
      }),
    [slug, shellStage, setLocation, querySuffix, onHostStageNavigate]
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
