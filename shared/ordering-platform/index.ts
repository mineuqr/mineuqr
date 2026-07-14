export {
  OFFER_CART_MENU_ITEM_ID_BASE,
  offerToCartMenuItemId,
  isOfferCartMenuItemId,
  cartMenuItemIdToOfferId,
} from "./offerCartIdentity";

export {
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_MOBILE,
  ORDERING_CHANNEL_WAITER_TABLET,
  ORDERING_CHANNEL_IDS,
  ORDERING_PLATFORM_OWNED_CONCERNS,
  ORDERING_CHANNEL_OWNED_CONCERNS,
  ORDERING_FORM_FACTORS,
  type OrderingChannelId,
  type OrderingPlatformOwnedConcern,
  type OrderingChannelOwnedConcern,
  type OrderingFormFactor,
} from "./orderingPlatformContracts";

export {
  ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION,
  type OrderingRuntimeContext,
  type OrderingRuntimeContextInput,
  type OrderingRuntimeRestaurant,
  type OrderingRuntimeBusiness,
  type OrderingRuntimeAvailability,
  type OrderingRuntimeLocale,
  type OrderingRuntimeMenuProjection,
  type OrderingRuntimeGuestPolicies,
  type OrderingRuntimeOrderingPolicies,
  type OrderingRuntimePricingContext,
  type OrderingRuntimeCapabilities,
  type OrderingRuntimeFeatureFlags,
  type OrderingRuntimeMetadata,
  type OrderingCartLineInput,
  type OrderingPlaceOrderCommand,
} from "./orderingRuntimeContract";

// freezeOrderingRuntimeContext is factory-internal — import via dedicated module only.