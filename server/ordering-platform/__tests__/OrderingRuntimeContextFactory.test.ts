import { describe, expect, it } from "vitest";
import { ORDERING_CHANNEL_QR } from "@shared/ordering-platform/orderingPlatformContracts";
import { ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION } from "@shared/ordering-platform/orderingRuntimeContract";
import type { OrderingRuntimeContextInput } from "@shared/ordering-platform/orderingRuntimeContract";
import {
  OrderingRuntimeContextError,
  OrderingRuntimeContextFactory,
  orderingRuntimeContextFactory,
} from "../OrderingRuntimeContextFactory";

function validInput(
  overrides: Partial<OrderingRuntimeContextInput> = {}
): OrderingRuntimeContextInput {
  return {
    channel: ORDERING_CHANNEL_QR,
    restaurant: {
      id: 1,
      slug: "demo",
      name: "Demo Restaurant",
      currency: "SAR",
      timezone: "Asia/Riyadh",
    },
    business: {
      businessDay: "2026-07-14",
      orderingAvailable: true,
      closureActive: false,
      hours: { isOpenNow: true, schedule: [{ day: "mon" }] },
    },
    availability: { canBrowse: true, canPlaceOrder: true, reasons: [] },
    locale: { language: "ar", direction: "rtl", theme: "brand" },
    menu: {
      projectionVersion: "v1",
      categories: [{ id: 1 }],
      products: [{ id: 10 }],
      modifiers: [],
      offers: [],
      availability: [],
    },
    policies: {
      cartConstraints: { maxItems: 50 },
      checkoutRules: { requireTable: true },
      guest: { guestOrderingEnabled: true },
    },
    pricing: {
      currency: "SAR",
      taxes: [{ id: "vat" }],
      serviceCharge: null,
      discountPipeline: [],
    },
    capabilities: {
      canBrowseMenu: true,
      canAddToCart: true,
      canCheckout: true,
      canPlaceOrder: true,
      supportedChannels: [ORDERING_CHANNEL_QR],
    },
    featureFlags: { offers_enabled: true },
    ...overrides,
  };
}

describe("ORDERING-RUNTIME-CONTEXT-1 OrderingRuntimeContextFactory", () => {
  const factory = new OrderingRuntimeContextFactory();

  it("creates an immutable OrderingRuntimeContext", () => {
    const ctx = factory.create(validInput());

    expect(ctx.channel).toBe(ORDERING_CHANNEL_QR);
    expect(ctx.restaurant.id).toBe(1);
    expect(ctx.metadata.schemaVersion).toBe(ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION);
    expect(ctx.metadata.runtimeId.length).toBeGreaterThan(0);
    expect(ctx.business.hours.schedule).toHaveLength(1);
    expect(ctx.menu.products).toHaveLength(1);
    expect(ctx.capabilities.supportedChannels).toEqual([ORDERING_CHANNEL_QR]);

    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.restaurant)).toBe(true);
    expect(Object.isFrozen(ctx.business)).toBe(true);
    expect(Object.isFrozen(ctx.business.hours)).toBe(true);
    expect(Object.isFrozen(ctx.business.hours.schedule)).toBe(true);
    expect(Object.isFrozen(ctx.availability.reasons)).toBe(true);
    expect(Object.isFrozen(ctx.menu)).toBe(true);
    expect(Object.isFrozen(ctx.menu.categories)).toBe(true);
    expect(Object.isFrozen(ctx.policies.guest)).toBe(true);
    expect(Object.isFrozen(ctx.pricing.taxes)).toBe(true);
    expect(Object.isFrozen(ctx.capabilities.supportedChannels)).toBe(true);
    expect(Object.isFrozen(ctx.featureFlags)).toBe(true);
    expect(Object.isFrozen(ctx.metadata)).toBe(true);
  });

  it("rejects mutation of frozen context", () => {
    const ctx = factory.create(validInput());
    let threw = false;
    try {
      // Assignment to frozen object throws in strict mode (module scope).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ctx as any).channel = "kiosk";
    } catch {
      threw = true;
    }
    expect(threw || ctx.channel === ORDERING_CHANNEL_QR).toBe(true);
    expect(ctx.channel).toBe(ORDERING_CHANNEL_QR);
  });

  it("rejects invalid channel", () => {
    expect(() =>
      factory.create(
        validInput({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          channel: "drive_thru" as any,
        })
      )
    ).toThrow(OrderingRuntimeContextError);
  });

  it("rejects missing restaurant slug", () => {
    expect(() =>
      factory.create(
        validInput({
          restaurant: {
            id: 1,
            slug: "  ",
            name: "Demo",
            currency: "SAR",
            timezone: "Asia/Riyadh",
          },
        })
      )
    ).toThrow(OrderingRuntimeContextError);
  });

  it("canonical singleton matches factory create contract", () => {
    const ctx = orderingRuntimeContextFactory.create(validInput());
    expect(ctx.restaurant.slug).toBe("demo");
    expect(Object.isFrozen(ctx)).toBe(true);
  });

  it("is presentation-independent (no form-factor fields)", () => {
    const ctx = factory.create(validInput());
    expect(ctx).not.toHaveProperty("orientation");
    expect(ctx).not.toHaveProperty("screenWidth");
    expect(ctx).not.toHaveProperty("formFactor");
    expect(ctx).not.toHaveProperty("deviceType");
  });
});
