import { createContext, useContext, type ReactNode } from "react";
import type { OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import type { CartScopeAdapter } from "../contracts/CartScopeAdapter";
import type { OrderingNavigator } from "../contracts/OrderingNavigator";
import type { OrderingClientRuntimeGates } from "../runtime/orderingRuntimeGates";
import type { OrderingClientRuntimeStatus } from "../runtime/useOrderingRuntime";
import { useOrderingRuntime } from "../runtime/useOrderingRuntime";

/**
 * ORDERING-CLIENT-RUNTIME-1 — presentation/runtime client context.
 * Does not duplicate OrderingRuntimeContext; holds consumption state + adapters only.
 */
export type OrderingClientContextValue = Readonly<{
  channel: OrderingChannelId;
  slug: string;
  status: OrderingClientRuntimeStatus;
  runtime: OrderingRuntimeContext | null;
  restaurant: unknown;
  gates: OrderingClientRuntimeGates;
  categories: unknown[];
  items: unknown[];
  offers: unknown[];
  holidays: unknown[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  cartScope: CartScopeAdapter | null;
  navigator: OrderingNavigator | null;
  refetch: () => void;
}>;

const OrderingClientContext = createContext<OrderingClientContextValue | null>(
  null
);

export type OrderingClientProviderProps = {
  channel: OrderingChannelId;
  slug: string;
  cartScope?: CartScopeAdapter | null;
  navigator?: OrderingNavigator | null;
  children: ReactNode;
};

/**
 * Root Client Platform composition — runtime lifecycle for the ordering experience.
 */
export function OrderingClientProvider({
  channel,
  slug,
  cartScope = null,
  navigator = null,
  children,
}: OrderingClientProviderProps) {
  const ordering = useOrderingRuntime(slug);

  const value: OrderingClientContextValue = {
    channel,
    slug,
    status: ordering.status,
    runtime: ordering.runtime,
    restaurant: ordering.restaurant,
    gates: ordering.gates,
    categories: ordering.categories,
    items: ordering.items,
    offers: ordering.offers,
    holidays: ordering.holidays,
    isLoading: ordering.isLoading,
    isError: ordering.isError,
    error: ordering.error,
    cartScope,
    navigator,
    refetch: () => {
      void ordering.refetch();
    },
  };

  return (
    <OrderingClientContext.Provider value={value}>
      {children}
    </OrderingClientContext.Provider>
  );
}

export function useOrderingClientRuntime(): OrderingClientContextValue {
  const ctx = useContext(OrderingClientContext);
  if (!ctx) {
    throw new Error(
      "useOrderingClientRuntime requires OrderingClientProvider (Ordering Client Platform host)"
    );
  }
  return ctx;
}

/** Optional access — QR browse-only pages may run without a table host. */
export function useOptionalOrderingClientRuntime(): OrderingClientContextValue | null {
  return useContext(OrderingClientContext);
}
