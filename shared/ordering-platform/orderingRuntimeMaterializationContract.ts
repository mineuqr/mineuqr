import type { OrderingChannelId } from "./orderingPlatformContracts";

/**
 * ORDERING-RUNTIME-MATERIALIZATION-1 — authoritative source bag for runtime composition.
 *
 * Repositories / business services supply these fragments.
 * Only OrderingRuntimeMaterializer may compose them into OrderingRuntimeContextInput.
 * Clients and repositories must never assemble runtime from these sources.
 */

/** Restaurant identity source — repository projection. */
export type OrderingRuntimeRestaurantSource = {
  id: number;
  slug: string;
  name: string;
  currency: string;
  timezone: string;
};

/** Business identity + day awareness source. */
export type OrderingRuntimeBusinessSource = {
  businessId?: string | null;
  businessDay: string;
  orderingAvailable: boolean;
  closureActive: boolean;
};

/** Working hours source — opaque schedule + open-state. */
export type OrderingRuntimeHoursSource = {
  schedule?: unknown[];
  isOpenNow: boolean;
  nextOpenAt?: string | null;
  nextCloseAt?: string | null;
};

/** Ordering availability gate source. */
export type OrderingRuntimeAvailabilitySource = {
  canBrowse: boolean;
  canPlaceOrder: boolean;
  reasons?: string[];
};

/** Locale / theme source (not form-factor). */
export type OrderingRuntimeLocaleSource = {
  language: string;
  direction: "ltr" | "rtl";
  theme?: string | null;
};

/** Menu / category / product / modifier / availability projection source. */
export type OrderingRuntimeMenuSource = {
  projectionVersion: string;
  categories?: unknown[];
  products?: unknown[];
  modifiers?: unknown[];
  offers?: unknown[];
  availability?: unknown[];
};

/** Guest + cart/checkout policy source. */
export type OrderingRuntimePoliciesSource = {
  cartConstraints?: Record<string, unknown>;
  checkoutRules?: Record<string, unknown>;
  guest: {
    guestOrderingEnabled: boolean;
    requireCustomerName?: boolean;
    requireCustomerPhone?: boolean;
    allowSpecialInstructions?: boolean;
  };
};

/** Pricing / tax / service-charge source. */
export type OrderingRuntimePricingSource = {
  currency: string;
  taxes?: unknown[];
  serviceCharge?: unknown | null;
  discountPipeline?: unknown[];
};

/** Capability declaration source. */
export type OrderingRuntimeCapabilitiesSource = {
  canBrowseMenu?: boolean;
  canAddToCart?: boolean;
  canCheckout?: boolean;
  canPlaceOrder?: boolean;
  supportedChannels?: OrderingChannelId[];
  notes?: {
    supportsOrderNotes?: boolean;
    supportsItemNotes?: boolean;
    maxOrderNoteLength?: number;
    maxItemNoteLength?: number;
    allowedPolicies?: string[];
  };
};

/**
 * Canonical materialization request — every required authoritative fragment.
 * Collection is complete when this bag is fully populated by callers
 * (future loaders assemble this from repositories; this program owns composition).
 */
export type OrderingRuntimeMaterializationRequest = {
  channel: OrderingChannelId;
  restaurant: OrderingRuntimeRestaurantSource;
  business: OrderingRuntimeBusinessSource;
  hours: OrderingRuntimeHoursSource;
  availability: OrderingRuntimeAvailabilitySource;
  locale: OrderingRuntimeLocaleSource;
  menu: OrderingRuntimeMenuSource;
  policies: OrderingRuntimePoliciesSource;
  pricing: OrderingRuntimePricingSource;
  /** Optional — derived/normalized when absent. */
  capabilities?: OrderingRuntimeCapabilitiesSource;
  featureFlags?: Record<string, boolean>;
  /** Channel-specific policy overlays — merged into checkout/cart constraints. */
  channelPolicies?: {
    cartConstraints?: Record<string, unknown>;
    checkoutRules?: Record<string, unknown>;
  };
  /** Clock for metadata.createdAt — injectable for tests. */
  now?: Date;
  /** Optional pre-assigned runtime id (diagnostics / correlation). */
  runtimeId?: string;
};
