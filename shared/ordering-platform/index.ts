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
  ORDERING_KIOSK_PRIMARY_INPUT,
  ORDERING_KIOSK_COMPATIBILITY_INPUTS,
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
  DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES,
} from "./orderingRuntimeContract";

export {
  fulfilmentProjectionFromIdentity,
  fulfilmentProjectionFromLegacyTable,
  resolveFulfilmentProjection,
  type OrderFulfilmentProjection,
} from "./orderFulfilmentProjection";

export {
  ORDERING_SERVICE_MODES,
  ORDERING_FULFILMENT_ANCHOR_TYPES,
  LEGACY_NON_TABLE_TABLE_ID,
  LEGACY_NON_TABLE_TABLE_NUMBER,
  ORDERING_RUNTIME_ORDER_IDENTITY_PLATFORM_CAPABILITIES,
  createTableFulfilmentAnchor,
  createStationFulfilmentAnchor,
  createPickupPointFulfilmentAnchor,
  createQueueFulfilmentAnchor,
  createDriveLaneFulfilmentAnchor,
  createOrderIdentity,
  createTableOrderIdentity,
  deriveFulfilmentLabel,
  legacyTableFieldsFromIdentity,
  isNonTableOrderIdentity,
  resolvePlaceOrderPersistFields,
  resolvePlaceOrderTableFields,
  resolvePlaceOrderSessionId,
  assertPlatformOrderIdentity,
  type OrderingServiceMode,
  type OrderingFulfilmentAnchorType,
  type OrderingFulfilmentAnchor,
  type OrderingTableFulfilmentAnchor,
  type OrderingStationFulfilmentAnchor,
  type OrderingPickupPointFulfilmentAnchor,
  type OrderingQueueFulfilmentAnchor,
  type OrderingDriveLaneFulfilmentAnchor,
  type OrderingOperationalSessionIdentity,
  type OrderingOrderIdentity,
  type OrderingRuntimeOrderIdentityPolicies,
} from "./orderingIdentityContract";

export {
  ORDERING_ORDER_NOTE_MAX_LENGTH,
  ORDERING_ITEM_NOTE_MAX_LENGTH,
  DEFAULT_ORDERING_NOTES_CAPABILITIES,
  validateOrderNote,
  validateItemNote,
  resolveOrderNoteInput,
  resolveItemNoteInput,
  type OrderingNoteKind,
  type OrderingNotesCapabilities,
  type OrderingNotesValidationResult,
} from "./orderingNotesContract";

export type {
  OrderingRuntimeMaterializationRequest,
  OrderingRuntimeRestaurantSource,
  OrderingRuntimeBusinessSource,
  OrderingRuntimeHoursSource,
  OrderingRuntimeAvailabilitySource,
  OrderingRuntimeLocaleSource,
  OrderingRuntimeMenuSource,
  OrderingRuntimePoliciesSource,
  OrderingRuntimePricingSource,
  OrderingRuntimeCapabilitiesSource,
} from "./orderingRuntimeMaterializationContract";

// freezeOrderingRuntimeContext is factory-internal — import via dedicated module only.
