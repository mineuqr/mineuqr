import { describe, expect, it } from "vitest";
import {
  deriveOrderingRuntimeGates,
  createQrTableCartScopeAdapter,
  createQrOrderingNavigator,
  resolveQrOrderingStage,
  ORDERING_CART_PERSISTENCE_NAMESPACE,
} from "../index";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import { DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES } from "@shared/ordering-platform/orderingIdentityContract";
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";

function sampleRuntime(
  overrides: Partial<OrderingRuntimeContext> = {}
): OrderingRuntimeContext {
  return {
    channel: ORDERING_CHANNEL_QR,
    restaurant: {
      id: 1,
      slug: "demo",
      name: "Demo",
      currency: "SAR",
      timezone: "Asia/Riyadh",
    },
    business: {
      businessId: "1",
      businessDay: "2026-07-14",
      orderingAvailable: true,
      closureActive: false,
      hours: {
        schedule: [],
        isOpenNow: true,
        nextOpenAt: null,
        nextCloseAt: null,
      },
    },
    availability: {
      canBrowse: true,
      canPlaceOrder: true,
      reasons: [],
    },
    locale: { language: "ar", direction: "rtl", theme: null },
    menu: {
      projectionVersion: "v1",
      categories: [],
      products: [],
      modifiers: [],
      offers: [],
      availability: [],
    },
    policies: {
      cartConstraints: {},
      checkoutRules: {},
      guest: {
        guestOrderingEnabled: true,
        requireCustomerName: false,
        requireCustomerPhone: false,
        allowSpecialInstructions: true,
      },
    },
    pricing: {
      currency: "SAR",
      taxes: [],
      serviceCharge: null,
      discountPipeline: [],
    },
    capabilities: {
      canBrowseMenu: true,
      canAddToCart: true,
      canCheckout: true,
      canPlaceOrder: true,
      supportedChannels: [ORDERING_CHANNEL_QR],
      notes: {
        supportsOrderNotes: true,
        supportsItemNotes: true,
        maxOrderNoteLength: 500,
        maxItemNoteLength: 300,
        allowedPolicies: ["plain_text"],
      },
    },
    orderIdentity: DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES,
    featureFlags: {},
    metadata: {
      schemaVersion: 1,
      createdAt: "2026-07-14T00:00:00.000Z",
      runtimeId: "r1",
    },
    ...overrides,
  };
}

describe("ORDERING-CLIENT-RUNTIME-1", () => {
  it("derives shared gates from runtime without recomputing hours", () => {
    const gates = deriveOrderingRuntimeGates(sampleRuntime());
    expect(gates.guestOrderingEnabled).toBe(true);
    expect(gates.orderingAllowed).toBe(true);
    expect(gates.platformCanPlaceOrder).toBe(true);
    expect(gates.canBrowse).toBe(true);
    expect(gates.notes.supportsOrderNotes).toBe(true);
  });

  it("QR cart scope adapter uses table storage key", () => {
    const adapter = createQrTableCartScopeAdapter("cafe", 4);
    expect(adapter.channel).toBe(ORDERING_CHANNEL_QR);
    expect(adapter.persistenceNamespace).toBe(ORDERING_CART_PERSISTENCE_NAMESPACE);
    expect(adapter.resolveScopeKey()).toBe("mineuqr:cart:cafe:4");
    expect(adapter.description).toEqual({ slug: "cafe", tableNumber: 4 });
  });

  it("QR navigator maps stages without embedding business rules", () => {
    const paths: string[] = [];
    const nav = createQrOrderingNavigator({
      slug: "cafe",
      tableNumber: 2,
      stage: resolveQrOrderingStage(false),
      setLocation: (path) => {
        paths.push(path);
      },
    });
    expect(nav.stage).toBe("browse");
    nav.goToCart();
    nav.goToCheckout();
    nav.goToBrowse();
    nav.goToConfirmation("tok");
    nav.goToTracking("tok");
    expect(paths).toEqual([
      "/menu/cafe/table/2",
      "/menu/cafe/table/2/checkout",
      "/menu/cafe/table/2",
      "/menu/cafe/order/tok/confirmed",
      "/menu/cafe/order/tok",
    ]);
  });
});
