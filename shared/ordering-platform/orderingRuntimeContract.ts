import type { OrderingChannelId } from "./orderingPlatformContracts";

/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 — immutable Ordering Runtime context contract.
 * Read-only snapshot produced by the platform for channel clients.
 * Clients must never calculate business rules locally.
 */
export type OrderingRuntimeContext = Readonly<{
  channel: OrderingChannelId;
  restaurant: Readonly<{
    id: number;
    slug: string;
    name: string;
    currency: string;
    timezone: string;
  }>;
  business: Readonly<{
    businessDay: string;
    orderingAvailable: boolean;
    closureActive: boolean;
  }>;
  availability: Readonly<{
    canBrowse: boolean;
    canPlaceOrder: boolean;
    reasons: readonly string[];
  }>;
  presentation: Readonly<{
    language: string;
    direction: "ltr" | "rtl";
    theme: string | null;
  }>;
  /** Platform menu projection — authoritative for all channels. */
  menu: Readonly<{
    projectionVersion: string;
    categories: readonly unknown[];
    products: readonly unknown[];
    modifiers: readonly unknown[];
    offers: readonly unknown[];
  }>;
  policies: Readonly<{
    cartConstraints: Readonly<Record<string, unknown>>;
    checkoutRules: Readonly<Record<string, unknown>>;
  }>;
  pricing: Readonly<{
    taxes: readonly unknown[];
    serviceCharge: unknown | null;
  }>;
}>;

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
