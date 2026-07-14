import { describe, expect, it } from "vitest";
import {
  KIOSK_ORDERING_CHANNEL,
  KIOSK_FORBIDDEN_PLATFORM_CONCERNS,
  KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION,
  KIOSK_RUNTIME_CONSUMPTION_ENTRY,
  KIOSK_SUPPORTED_FORM_FACTORS,
  KIOSK_CHANNEL_CONCERNS,
} from "../kioskOrderingChannelContract";
import {
  KIOSK_EXPERIENCE_LIFECYCLE_STAGES,
  KIOSK_EXPERIENCE_LIFECYCLE_FLOW,
} from "../kioskExperienceLifecycle";
import {
  KIOSK_SESSION_RESET_TRIGGERS,
  KIOSK_SESSION_ISOLATION_RULES,
  KIOSK_SESSION_RESET_REQUIRES_ALL_ISOLATION_RULES,
} from "../kioskSessionLifecycle";
import {
  deriveKioskOrderingRuntimeGates,
  assertKioskRuntimeChannel,
  KIOSK_RUNTIME_CHANNEL_ID,
} from "../kioskRuntimeConsumerContract";
import { ORDERING_CHANNEL_KIOSK } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";

function sampleKioskRuntime(
  overrides: Partial<OrderingRuntimeContext> = {}
): OrderingRuntimeContext {
  return {
    channel: ORDERING_CHANNEL_KIOSK,
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
      supportedChannels: [ORDERING_CHANNEL_KIOSK],
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
      runtimeId: "kiosk-r1",
    },
    ...overrides,
  };
}

describe("SELF-ORDERING-KIOSK-ARCHITECTURE-1 contracts", () => {
  it("registers kiosk as ordering channel client", () => {
    expect(KIOSK_ORDERING_CHANNEL).toBe(ORDERING_CHANNEL_KIOSK);
    expect(KIOSK_RUNTIME_CHANNEL_ID).toBe("kiosk");
    expect(KIOSK_RUNTIME_CONSUMPTION_ENTRY).toBe("ordering.getRuntimeBySlug");
  });

  it("forbids platform concerns and runtime construction", () => {
    expect(KIOSK_FORBIDDEN_PLATFORM_CONCERNS).toContain("place_order_orchestration");
    expect(KIOSK_FORBIDDEN_PLATFORM_CONCERNS).toContain("price_calculation");
    expect(KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION).toContain("OrderingRuntimeMaterializer");
    expect(KIOSK_FORBIDDEN_RUNTIME_CONSTRUCTION).toContain("OrderingRuntimeContextFactory");
  });

  it("defines experience lifecycle ending in automatic reset to idle", () => {
    expect(KIOSK_EXPERIENCE_LIFECYCLE_STAGES).toContain("idle");
    expect(KIOSK_EXPERIENCE_LIFECYCLE_STAGES).toContain("place_order");
    expect(KIOSK_EXPERIENCE_LIFECYCLE_STAGES).toContain("automatic_reset");
    expect(KIOSK_EXPERIENCE_LIFECYCLE_FLOW).toContainEqual(["confirmation", "automatic_reset"]);
    expect(KIOSK_EXPERIENCE_LIFECYCLE_FLOW).toContainEqual(["automatic_reset", "idle"]);
  });

  it("requires full session isolation on every reset trigger", () => {
    expect(KIOSK_SESSION_RESET_TRIGGERS).toEqual([
      "successful_order",
      "cancellation",
      "timeout",
      "administrative_reset",
    ]);
    expect(KIOSK_SESSION_ISOLATION_RULES).toContain("clear_cart");
    expect(KIOSK_SESSION_ISOLATION_RULES).toContain("return_to_idle_experience");
    expect(KIOSK_SESSION_RESET_REQUIRES_ALL_ISOLATION_RULES).toBe(true);
  });

  it("supports adaptive kiosk form factors without business fields", () => {
    expect(KIOSK_SUPPORTED_FORM_FACTORS).toContain("portrait_kiosk");
    expect(KIOSK_SUPPORTED_FORM_FACTORS).toContain("landscape_kiosk");
    expect(KIOSK_CHANNEL_CONCERNS).toContain("touch_first_interaction");
    expect(KIOSK_CHANNEL_CONCERNS).not.toContain("price_calculation");
  });

  it("derives gates from runtime without inventing business state", () => {
    const gates = deriveKioskOrderingRuntimeGates(sampleKioskRuntime());
    expect(gates.platformCanPlaceOrder).toBe(true);
    expect(assertKioskRuntimeChannel(sampleKioskRuntime())).toBe(true);
    expect(
      assertKioskRuntimeChannel(
        sampleKioskRuntime({ channel: "qr" })
      )
    ).toBe(false);
  });
});
