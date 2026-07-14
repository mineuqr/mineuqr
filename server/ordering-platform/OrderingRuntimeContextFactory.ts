import { randomUUID } from "node:crypto";
import { ORDERING_CHANNEL_IDS, type OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";
import {
  ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION,
  type OrderingRuntimeContext,
  type OrderingRuntimeContextInput,
} from "@shared/ordering-platform/orderingRuntimeContract";
import { freezeOrderingRuntimeContext } from "@shared/ordering-platform/freezeOrderingRuntimeContext";

/**
 * ORDERING-RUNTIME-CONTEXT-1 — sole constructor for OrderingRuntimeContext.
 *
 * Owns construction + immutability. Does not load/materialize from DB
 * (materialization is a future program). Callers supply a complete input snapshot.
 */

export class OrderingRuntimeContextError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OrderingRuntimeContextError";
    this.code = code;
  }
}

const CHANNEL_SET = new Set<string>(ORDERING_CHANNEL_IDS);

function assertChannel(channel: string): asserts channel is OrderingChannelId {
  if (!CHANNEL_SET.has(channel)) {
    throw new OrderingRuntimeContextError(
      "INVALID_CHANNEL",
      `Unknown ordering channel: ${channel}`
    );
  }
}

function assertRestaurant(input: OrderingRuntimeContextInput["restaurant"]): void {
  if (!Number.isInteger(input.id) || input.id <= 0) {
    throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.id must be a positive integer");
  }
  if (!input.slug?.trim()) {
    throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.slug is required");
  }
  if (!input.name?.trim()) {
    throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.name is required");
  }
  if (!input.currency?.trim()) {
    throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.currency is required");
  }
  if (!input.timezone?.trim()) {
    throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.timezone is required");
  }
}

/**
 * Platform-owned factory — the only allowed construction path for OrderingRuntimeContext.
 */
export class OrderingRuntimeContextFactory {
  /**
   * Construct an immutable OrderingRuntimeContext from a complete platform input snapshot.
   */
  create(input: OrderingRuntimeContextInput): OrderingRuntimeContext {
    assertChannel(input.channel);
    assertRestaurant(input.restaurant);

    if (!input.business.businessDay?.trim()) {
      throw new OrderingRuntimeContextError("INVALID_BUSINESS", "business.businessDay is required");
    }
    if (!input.menu.projectionVersion?.trim()) {
      throw new OrderingRuntimeContextError("INVALID_MENU", "menu.projectionVersion is required");
    }
    if (!input.pricing.currency?.trim()) {
      throw new OrderingRuntimeContextError("INVALID_PRICING", "pricing.currency is required");
    }
    if (!Array.isArray(input.capabilities.supportedChannels)) {
      throw new OrderingRuntimeContextError(
        "INVALID_CAPABILITIES",
        "capabilities.supportedChannels must be an array"
      );
    }
    for (const ch of input.capabilities.supportedChannels) {
      assertChannel(ch);
    }

    const createdAt = input.metadata?.createdAt ?? new Date().toISOString();
    const runtimeId = input.metadata?.runtimeId ?? randomUUID();

    const context: OrderingRuntimeContext = {
      channel: input.channel,
      restaurant: {
        id: input.restaurant.id,
        slug: input.restaurant.slug,
        name: input.restaurant.name,
        currency: input.restaurant.currency,
        timezone: input.restaurant.timezone,
      },
      business: {
        businessId: input.business.businessId ?? null,
        businessDay: input.business.businessDay,
        orderingAvailable: Boolean(input.business.orderingAvailable),
        closureActive: Boolean(input.business.closureActive),
        hours: {
          schedule: Object.freeze([...(input.business.hours.schedule ?? [])]),
          isOpenNow: Boolean(input.business.hours.isOpenNow),
          nextOpenAt: input.business.hours.nextOpenAt ?? null,
          nextCloseAt: input.business.hours.nextCloseAt ?? null,
        },
      },
      availability: {
        canBrowse: Boolean(input.availability.canBrowse),
        canPlaceOrder: Boolean(input.availability.canPlaceOrder),
        reasons: Object.freeze([...(input.availability.reasons ?? [])]),
      },
      locale: {
        language: input.locale.language,
        direction: input.locale.direction,
        theme: input.locale.theme ?? null,
      },
      menu: {
        projectionVersion: input.menu.projectionVersion,
        categories: Object.freeze([...(input.menu.categories ?? [])]),
        products: Object.freeze([...(input.menu.products ?? [])]),
        modifiers: Object.freeze([...(input.menu.modifiers ?? [])]),
        offers: Object.freeze([...(input.menu.offers ?? [])]),
        availability: Object.freeze([...(input.menu.availability ?? [])]),
      },
      policies: {
        cartConstraints: Object.freeze({ ...(input.policies.cartConstraints ?? {}) }),
        checkoutRules: Object.freeze({ ...(input.policies.checkoutRules ?? {}) }),
        guest: {
          guestOrderingEnabled: Boolean(input.policies.guest.guestOrderingEnabled),
          requireCustomerName: Boolean(input.policies.guest.requireCustomerName),
          requireCustomerPhone: Boolean(input.policies.guest.requireCustomerPhone),
          allowSpecialInstructions:
            input.policies.guest.allowSpecialInstructions !== false,
        },
      },
      pricing: {
        currency: input.pricing.currency,
        taxes: Object.freeze([...(input.pricing.taxes ?? [])]),
        serviceCharge: input.pricing.serviceCharge ?? null,
        discountPipeline: Object.freeze([...(input.pricing.discountPipeline ?? [])]),
      },
      capabilities: {
        canBrowseMenu: Boolean(input.capabilities.canBrowseMenu),
        canAddToCart: Boolean(input.capabilities.canAddToCart),
        canCheckout: Boolean(input.capabilities.canCheckout),
        canPlaceOrder: Boolean(input.capabilities.canPlaceOrder),
        supportedChannels: Object.freeze([...input.capabilities.supportedChannels]),
      },
      featureFlags: Object.freeze({ ...(input.featureFlags ?? {}) }),
      metadata: {
        schemaVersion: ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION,
        createdAt,
        runtimeId,
      },
    };

    return freezeOrderingRuntimeContext(context);
  }
}

/** Canonical singleton — prefer this over ad-hoc construction. */
export const orderingRuntimeContextFactory = new OrderingRuntimeContextFactory();
