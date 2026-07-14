/**
 * ORDERING-CLIENT-RUNTIME-1 — Ordering Client Platform public API.
 */

export type { CartScopeAdapter, CartScopeDescription } from "./contracts/CartScopeAdapter";
export type {
  OrderingClientStage,
  OrderingNavigator,
} from "./contracts/OrderingNavigator";
export { ORDERING_CLIENT_STAGES } from "./contracts/OrderingNavigator";

export {
  deriveOrderingRuntimeGates,
  asOrderingMenuList,
  type OrderingClientRuntimeGates,
} from "./runtime/orderingRuntimeGates";
export {
  useOrderingRuntime,
  type OrderingClientRuntimeStatus,
} from "./runtime/useOrderingRuntime";
export { OrderingClientErrorBoundary } from "./runtime/OrderingClientErrorBoundary";

export {
  OrderingClientProvider,
  useOrderingClientRuntime,
  useOptionalOrderingClientRuntime,
  type OrderingClientContextValue,
  type OrderingClientProviderProps,
} from "./context/OrderingClientProvider";

export { createQrTableCartScopeAdapter } from "./qr/createQrCartScopeAdapter";
export {
  createQrOrderingNavigator,
  resolveQrOrderingStage,
} from "./qr/createQrOrderingNavigator";
export {
  QrOrderingClientHost,
  type QrOrderingClientHostProps,
} from "./qr/QrOrderingClientHost";
