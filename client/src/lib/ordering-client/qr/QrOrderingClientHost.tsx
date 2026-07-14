import { useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import { CartProvider } from "@/contexts/CartContext";
import { OrderingClientProvider } from "../context/OrderingClientProvider";
import { OrderingClientErrorBoundary } from "../runtime/OrderingClientErrorBoundary";
import { createQrTableCartScopeAdapter } from "./createQrCartScopeAdapter";
import {
  createQrOrderingNavigator,
  resolveQrOrderingStage,
} from "./createQrOrderingNavigator";

export type QrOrderingClientHostProps = {
  slug: string;
  tableNumber: number;
  /** When true, experience is on checkout stage. */
  isCheckout: boolean;
  children: ReactNode;
};

/**
 * ORDERING-CLIENT-RUNTIME-1 — QR shell host for the Ordering Client Platform.
 * QR supplies cart scope + navigator; platform owns runtime consumption.
 */
export function QrOrderingClientHost({
  slug,
  tableNumber,
  isCheckout,
  children,
}: QrOrderingClientHostProps) {
  const [, setLocation] = useLocation();
  const cartScope = useMemo(
    () => createQrTableCartScopeAdapter(slug, tableNumber),
    [slug, tableNumber]
  );
  const navigator = useMemo(
    () =>
      createQrOrderingNavigator({
        slug,
        tableNumber,
        stage: resolveQrOrderingStage(isCheckout),
        setLocation,
      }),
    [slug, tableNumber, isCheckout, setLocation]
  );

  const tableScope = cartScope.description.tableNumber;
  if (!slug || !tableScope || tableScope <= 0) return null;

  return (
    <OrderingClientErrorBoundary>
      <OrderingClientProvider
        channel={ORDERING_CHANNEL_QR}
        slug={slug}
        cartScope={cartScope}
        navigator={navigator}
      >
        <CartProvider cartScope={{ slug, tableNumber: tableScope }}>
          {children}
        </CartProvider>
      </OrderingClientProvider>
    </OrderingClientErrorBoundary>
  );
}
