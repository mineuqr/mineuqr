/**
 * ORDERING-CLIENT-RUNTIME-1 / CART-1 / BROWSE-1 / CHECKOUT-1 / GOVERNANCE-1 —
 * Ordering Client Platform API.
 */

export type { CartScopeAdapter, CartScopeDescription } from "./contracts/CartScopeAdapter";
export type {
  OrderingClientStage,
  OrderingNavigator,
} from "./contracts/OrderingNavigator";
export { ORDERING_CLIENT_STAGES } from "./contracts/OrderingNavigator";
export {
  createKioskDeviceCartScopeAdapter,
  createWaiterStationCartScopeAdapter,
} from "./contracts/createChannelCartScopeAdapters";

export {
  ORDERING_CLIENT_LAYER_STACK,
  ORDERING_CLIENT_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_SHELL_OWNED_CONCERNS,
  ORDERING_CLIENT_REQUIRED_ADAPTERS,
  ORDERING_CLIENT_DEPENDENCY_RULES,
  type OrderingClientLayer,
  type OrderingClientPlatformOwnedConcern,
  type OrderingChannelShellOwnedConcern,
} from "./governance/orderingClientGovernance";

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

export type {
  OrderingBrowseTab,
  BrowsePresentationStatus,
  OrderingBrowseCatalogItem,
  OrderingBrowseCategory,
} from "./browse/browseTypes";
export {
  filterBrowseItems,
  resolveDefaultCategoryId,
  resolveBrowseMenuTab,
  resolveBrowsePresentationStatus,
} from "./browse/browseCatalog";
export {
  OrderingBrowseProvider,
  useOrderingBrowse,
  useOptionalOrderingBrowse,
  type OrderingBrowseContextValue,
  type OrderingBrowseProviderProps,
} from "./browse/OrderingBrowseProvider";

export type { OrderingCartItem, CartItem } from "./cart/cartTypes";
export {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  ORDERING_CART_STORAGE_VERSION,
  buildCartPersistenceKey,
  loadCartByScopeKey,
  saveCartByScopeKey,
  clearCartByScopeKey,
} from "./cart/cartPersistence";
export {
  OrderingCartProvider,
  useOrderingCart,
  useCart,
  type OrderingCartContextValue,
  type OrderingCartCapabilities,
  type OrderingCartProviderProps,
} from "./cart/OrderingCartProvider";

export type {
  CheckoutSubmissionStatus,
  CheckoutOrderSummaryLine,
  CheckoutSubmitError,
  CheckoutSubmitErrorCode,
  CheckoutPlaceOrderResult,
  CheckoutDraftSnapshot,
  CheckoutSubmitRequest,
  CheckoutSubmitOutcome,
} from "./checkout/checkoutTypes";
export {
  buildOrderSummaryLines,
  validateCheckoutNotes,
  mapCheckoutSubmitError,
  presentOrderNoteError,
} from "./checkout/checkoutSubmission";
export {
  OrderingCheckoutProvider,
  useOrderingCheckout,
  useOptionalOrderingCheckout,
  type OrderingCheckoutContextValue,
  type OrderingCheckoutProviderProps,
} from "./checkout/OrderingCheckoutProvider";

export { createQrTableCartScopeAdapter } from "./qr/createQrCartScopeAdapter";
export {
  createQrOrderingNavigator,
  resolveQrOrderingStage,
} from "./qr/createQrOrderingNavigator";
export {
  QrOrderingClientHost,
  type QrOrderingClientHostProps,
} from "./qr/QrOrderingClientHost";
export {
  QrBrowseOnlyHost,
  type QrBrowseOnlyHostProps,
} from "./qr/QrBrowseOnlyHost";
