import type { OrderingChannelId } from "./orderingPlatformContracts";

/**
 * ORDERING-RUNTIME-CONTEXT-1 — immutable Ordering Runtime Context contract.
 *
 * Canonical read-only snapshot of the restaurant ordering environment.
 * Produced exclusively by OrderingRuntimeContextFactory (server platform).
 * Clients consume; clients never construct or mutate.
 *
 * Presentation-independent: no screen size, device type, or form-factor fields.
 */

export const ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION = 1 as const;

/** Restaurant identity within the ordering platform. */
export type OrderingRuntimeRestaurant = Readonly<{
  id: number;
  slug: string;
  name: string;
  currency: string;
  timezone: string;
}>;

/** Business-day and commercial identity layer. */
export type OrderingRuntimeBusiness = Readonly<{
  businessId: string | null;
  businessDay: string;
  orderingAvailable: boolean;
  closureActive: boolean;
  hours: Readonly<{
    /** Opaque schedule projection — platform-owned; clients display only. */
    schedule: readonly unknown[];
    isOpenNow: boolean;
    nextOpenAt: string | null;
    nextCloseAt: string | null;
  }>;
}>;

/** Ordering availability gate for browse vs place-order. */
export type OrderingRuntimeAvailability = Readonly<{
  canBrowse: boolean;
  canPlaceOrder: boolean;
  reasons: readonly string[];
}>;

/**
 * Locale/theme hints from the restaurant — not layout or viewport fields.
 * Channels adapt UI independently; these values do not encode viewport geometry.
 */
export type OrderingRuntimeLocale = Readonly<{
  language: string;
  direction: "ltr" | "rtl";
  theme: string | null;
}>;

/** Platform menu / category / product / modifier / availability projection. */
export type OrderingRuntimeMenuProjection = Readonly<{
  projectionVersion: string;
  categories: readonly unknown[];
  products: readonly unknown[];
  modifiers: readonly unknown[];
  offers: readonly unknown[];
  availability: readonly unknown[];
}>;

/** Guest ordering policies owned by the platform. */
export type OrderingRuntimeGuestPolicies = Readonly<{
  guestOrderingEnabled: boolean;
  requireCustomerName: boolean;
  requireCustomerPhone: boolean;
  allowSpecialInstructions: boolean;
}>;

/** Cart / checkout policy constraints. */
export type OrderingRuntimeOrderingPolicies = Readonly<{
  cartConstraints: Readonly<Record<string, unknown>>;
  checkoutRules: Readonly<Record<string, unknown>>;
  guest: OrderingRuntimeGuestPolicies;
}>;

/** Pricing / tax / service-charge context (authoritative resolution remains server-side). */
export type OrderingRuntimePricingContext = Readonly<{
  currency: string;
  taxes: readonly unknown[];
  serviceCharge: unknown | null;
  discountPipeline: readonly unknown[];
}>;

/** Channel-agnostic ordering capabilities exposed by the platform. */
export type OrderingRuntimeCapabilities = Readonly<{
  canBrowseMenu: boolean;
  canAddToCart: boolean;
  canCheckout: boolean;
  canPlaceOrder: boolean;
  supportedChannels: readonly OrderingChannelId[];
}>;

/** Runtime feature flags — platform-controlled. */
export type OrderingRuntimeFeatureFlags = Readonly<Record<string, boolean>>;

/** Factory metadata — correlates snapshots; not business rules. */
export type OrderingRuntimeMetadata = Readonly<{
  schemaVersion: typeof ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION;
  createdAt: string;
  /** Opaque runtime snapshot id for diagnostics. */
  runtimeId: string;
}>;

/**
 * Immutable Ordering Runtime Context — single source of truth for ordering channels.
 */
export type OrderingRuntimeContext = Readonly<{
  channel: OrderingChannelId;
  restaurant: OrderingRuntimeRestaurant;
  business: OrderingRuntimeBusiness;
  availability: OrderingRuntimeAvailability;
  locale: OrderingRuntimeLocale;
  menu: OrderingRuntimeMenuProjection;
  policies: OrderingRuntimeOrderingPolicies;
  pricing: OrderingRuntimePricingContext;
  capabilities: OrderingRuntimeCapabilities;
  featureFlags: OrderingRuntimeFeatureFlags;
  metadata: OrderingRuntimeMetadata;
}>;

/**
 * Fully normalized construction input for OrderingRuntimeContextFactory.
 *
 * ORDERING-RUNTIME-MATERIALIZATION-1 — produced ONLY by OrderingRuntimeMaterializer.
 * Factory must not apply business defaults or compose sources; it constructs + freezes.
 */
export type OrderingRuntimeContextInput = {
  channel: OrderingChannelId;
  restaurant: {
    id: number;
    slug: string;
    name: string;
    currency: string;
    timezone: string;
  };
  business: {
    businessId: string | null;
    businessDay: string;
    orderingAvailable: boolean;
    closureActive: boolean;
    hours: {
      schedule: unknown[];
      isOpenNow: boolean;
      nextOpenAt: string | null;
      nextCloseAt: string | null;
    };
  };
  availability: {
    canBrowse: boolean;
    canPlaceOrder: boolean;
    reasons: string[];
  };
  locale: {
    language: string;
    direction: "ltr" | "rtl";
    theme: string | null;
  };
  menu: {
    projectionVersion: string;
    categories: unknown[];
    products: unknown[];
    modifiers: unknown[];
    offers: unknown[];
    availability: unknown[];
  };
  policies: {
    cartConstraints: Record<string, unknown>;
    checkoutRules: Record<string, unknown>;
    guest: {
      guestOrderingEnabled: boolean;
      requireCustomerName: boolean;
      requireCustomerPhone: boolean;
      allowSpecialInstructions: boolean;
    };
  };
  pricing: {
    currency: string;
    taxes: unknown[];
    serviceCharge: unknown | null;
    discountPipeline: unknown[];
  };
  capabilities: {
    canBrowseMenu: boolean;
    canAddToCart: boolean;
    canCheckout: boolean;
    canPlaceOrder: boolean;
    supportedChannels: OrderingChannelId[];
  };
  featureFlags: Record<string, boolean>;
  metadata: {
    createdAt: string;
    runtimeId: string;
  };
};

/** Cart line input — channels submit identity + quantity only; platform resolves pricing. */
export type OrderingCartLineInput = Readonly<{
  menuItemId: number;
  quantity: number;
  notes?: string | null;
}>;

/** Place order command — all channels converge here. */
export type OrderingPlaceOrderCommand = Readonly<{
  channel: OrderingChannelId;
  restaurantId: number;
  tableId: number;
  sessionId: number | null;
  items: readonly OrderingCartLineInput[];
  customerName?: string | null;
  customerPhone?: string | null;
  notes?: string | null;
}>;
