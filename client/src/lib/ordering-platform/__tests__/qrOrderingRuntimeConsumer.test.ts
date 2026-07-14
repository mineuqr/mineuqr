import { describe, expect, it } from "vitest";
import { deriveQrOrderingRuntimeGates } from "../qrOrderingRuntimeConsumer";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
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
    featureFlags: {},
    metadata: {
      schemaVersion: 1,
      createdAt: "2026-07-14T00:00:00.000Z",
      runtimeId: "r1",
    },
    ...overrides,
  };
}

describe("QR-ORDERING-RUNTIME-MIGRATION-1 qrOrderingRuntimeConsumer", () => {
  it("derives gates from runtime without recomputing hours", () => {
    const gates = deriveQrOrderingRuntimeGates(sampleRuntime());
    expect(gates.guestOrderingEnabled).toBe(true);
    expect(gates.orderingAllowed).toBe(true);
    expect(gates.platformCanPlaceOrder).toBe(true);
  });

  it("reflects closed hours from runtime business hours", () => {
    const gates = deriveQrOrderingRuntimeGates(
      sampleRuntime({
        business: {
          businessId: "1",
          businessDay: "2026-07-14",
          orderingAvailable: true,
          closureActive: false,
          hours: {
            schedule: [],
            isOpenNow: false,
            nextOpenAt: null,
            nextCloseAt: null,
          },
        },
        availability: { canBrowse: true, canPlaceOrder: false, reasons: ["outside_business_hours"] },
      })
    );
    expect(gates.orderingAllowed).toBe(false);
    expect(gates.platformCanPlaceOrder).toBe(false);
  });
});
