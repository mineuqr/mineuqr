import { describe, expect, it } from "vitest";
import {
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
} from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeMaterializationRequest } from "@shared/ordering-platform/orderingRuntimeMaterializationContract";
import {
  OrderingRuntimeMaterializationError,
  OrderingRuntimeMaterializer,
  orderingRuntimeMaterializer,
} from "../OrderingRuntimeMaterializer";

function validRequest(
  overrides: Partial<OrderingRuntimeMaterializationRequest> = {}
): OrderingRuntimeMaterializationRequest {
  return {
    channel: ORDERING_CHANNEL_QR,
    restaurant: {
      id: 1,
      slug: " demo ",
      name: " Demo Restaurant ",
      currency: "sar",
      timezone: "Asia/Riyadh",
    },
    business: {
      businessDay: "2026-07-14",
      orderingAvailable: true,
      closureActive: false,
    },
    hours: { isOpenNow: true, schedule: [{ day: "mon" }] },
    availability: { canBrowse: true, canPlaceOrder: true },
    locale: { language: "ar", direction: "rtl" },
    menu: {
      projectionVersion: "v1",
      categories: [{ id: 1 }],
      products: [{ id: 10 }],
    },
    policies: {
      guest: { guestOrderingEnabled: true },
      cartConstraints: { maxItems: 20 },
    },
    pricing: { currency: "sar", taxes: [{ id: "vat" }] },
    featureFlags: { offers_enabled: true },
    now: new Date("2026-07-14T12:00:00.000Z"),
    runtimeId: "mat-runtime-1",
    ...overrides,
  };
}

describe("ORDERING-RUNTIME-MATERIALIZATION-1 OrderingRuntimeMaterializer", () => {
  const materializer = new OrderingRuntimeMaterializer();

  it("composes normalized OrderingRuntimeContextInput", () => {
    const input = materializer.composeInput(validRequest());

    expect(input.restaurant.slug).toBe("demo");
    expect(input.restaurant.currency).toBe("SAR");
    expect(input.pricing.currency).toBe("SAR");
    expect(input.business.businessId).toBeNull();
    expect(input.menu.modifiers).toEqual([]);
    expect(input.policies.guest.allowSpecialInstructions).toBe(true);
    expect(input.metadata.runtimeId).toBe("mat-runtime-1");
    expect(input.metadata.createdAt).toBe("2026-07-14T12:00:00.000Z");
    expect(input.capabilities.supportedChannels).toEqual([ORDERING_CHANNEL_QR]);
    expect(input.orderIdentity?.defaultServiceMode).toBe("table_service");
    expect(input.orderIdentity?.supportedFulfilmentAnchorTypes).toEqual(["table"]);
  });

  it("materializes immutable OrderingRuntimeContext via factory", () => {
    const ctx = materializer.materialize(validRequest());
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(ctx.restaurant.name).toBe("Demo Restaurant");
    expect(ctx.menu.products).toHaveLength(1);
    expect(ctx.featureFlags.offers_enabled).toBe(true);
    expect(ctx.orderIdentity.defaultServiceMode).toBe("table_service");
    expect(ctx.orderIdentity.supportedServiceModes).toContain("table_service");
  });

  it("derives availability reasons and gates place-order on closure", () => {
    const input = materializer.composeInput(
      validRequest({
        business: {
          businessDay: "2026-07-14",
          orderingAvailable: true,
          closureActive: true,
        },
        availability: { canBrowse: true, canPlaceOrder: true },
      })
    );
    expect(input.availability.canPlaceOrder).toBe(false);
    expect(input.availability.reasons).toContain("closure_active");
  });

  it("gates place-order when outside business hours", () => {
    const input = materializer.composeInput(
      validRequest({
        hours: { isOpenNow: false, schedule: [] },
        availability: { canBrowse: true, canPlaceOrder: true },
      })
    );
    expect(input.availability.canPlaceOrder).toBe(false);
    expect(input.availability.reasons).toContain("outside_business_hours");
  });

  it("merges channel policy overlays", () => {
    const input = materializer.composeInput(
      validRequest({
        channelPolicies: {
          cartConstraints: { maxItems: 5 },
          checkoutRules: { requireName: true },
        },
      })
    );
    expect(input.policies.cartConstraints.maxItems).toBe(5);
    expect(input.policies.checkoutRules.requireName).toBe(true);
  });

  it("rejects currency mismatch between restaurant and pricing", () => {
    expect(() =>
      materializer.composeInput(
        validRequest({
          pricing: { currency: "USD" },
        })
      )
    ).toThrow(OrderingRuntimeMaterializationError);
  });

  it("rejects channel not listed in supportedChannels", () => {
    expect(() =>
      materializer.composeInput(
        validRequest({
          capabilities: {
            supportedChannels: [ORDERING_CHANNEL_KIOSK],
          },
        })
      )
    ).toThrow(OrderingRuntimeMaterializationError);
  });

  it("materializes default note capabilities", () => {
    const input = materializer.composeInput(validRequest());
    expect(input.capabilities.notes.supportsOrderNotes).toBe(true);
    expect(input.capabilities.notes.supportsItemNotes).toBe(true);
    expect(input.capabilities.notes.maxOrderNoteLength).toBeGreaterThan(0);
  });

  it("canonical singleton materializes", () => {
    const ctx = orderingRuntimeMaterializer.materialize(validRequest());
    expect(ctx.channel).toBe(ORDERING_CHANNEL_QR);
  });
});
