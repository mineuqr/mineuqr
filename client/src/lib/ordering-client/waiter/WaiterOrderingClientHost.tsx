import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ORDERING_CHANNEL_WAITER_TABLET } from "@shared/ordering-platform/orderingPlatformContracts";
import { OrderingBrowseProvider } from "../browse/OrderingBrowseProvider";
import { OrderingCartProvider } from "../cart/OrderingCartProvider";
import { OrderingCheckoutProvider } from "../checkout/OrderingCheckoutProvider";
import { OrderingClientProvider } from "../context/OrderingClientProvider";
import { OrderingClientErrorBoundary } from "../runtime/OrderingClientErrorBoundary";
import { createWaiterStationCartScopeAdapter } from "../contracts/createChannelCartScopeAdapters";
import {
  createWaiterOrderingNavigator,
  resolveWaiterOrderingStage,
  type WaiterShellStage,
} from "./createWaiterOrderingNavigator";

export type WaiterOrderingClientHostProps = {
  slug: string;
  stationId: string;
  tableNumber: number;
  sessionId: number;
  /** Channel query string to preserve across navigator transitions. */
  querySuffix?: string;
  /**
   * OPERATIONAL-SCREEN-CATALOG-POLICY-1 — Screen Runtime host stage controller.
   * When set, navigator updates host state instead of `/waiter` URLs.
   */
  onHostStageNavigate?: (
    stage: WaiterShellStage,
    extras?: { trackingToken?: string }
  ) => void;
  hostStage?: WaiterShellStage;
  children: ReactNode;
};

/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter shell host.
 * Supplies CartScopeAdapter + OrderingNavigator; Client Platform owns
 * browse / cart / checkout. No duplicated providers.
 */
export function WaiterOrderingClientHost({
  slug,
  stationId,
  tableNumber,
  sessionId,
  querySuffix,
  onHostStageNavigate,
  hostStage,
  children,
}: WaiterOrderingClientHostProps) {
  const [location, setLocation] = useLocation();
  const cartScope = useMemo(
    () =>
      createWaiterStationCartScopeAdapter({
        slug,
        stationId,
        tableNumber,
        sessionId: String(sessionId),
      }),
    [slug, stationId, tableNumber, sessionId]
  );
  const shellStage =
    onHostStageNavigate && hostStage
      ? hostStage
      : resolveWaiterOrderingStage(location);
  const navigator = useMemo(
    () =>
      createWaiterOrderingNavigator({
        slug,
        stage: shellStage,
        setLocation,
        querySuffix,
        onHostStageNavigate,
      }),
    [slug, shellStage, setLocation, querySuffix, onHostStageNavigate]
  );

  if (!slug || !stationId || !tableNumber || !sessionId) return null;

  return (
    <OrderingClientErrorBoundary>
      <OrderingClientProvider
        channel={ORDERING_CHANNEL_WAITER_TABLET}
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
