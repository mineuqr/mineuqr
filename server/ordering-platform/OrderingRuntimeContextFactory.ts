import { ORDERING_CHANNEL_IDS, type OrderingChannelId } from "@shared/ordering-platform/orderingPlatformContracts";
import {
  ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION,
  type OrderingRuntimeContext,
  type OrderingRuntimeContextInput,
} from "@shared/ordering-platform/orderingRuntimeContract";
import { DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES } from "@shared/ordering-platform/orderingIdentityContract";
import { freezeOrderingRuntimeContext } from "@shared/ordering-platform/freezeOrderingRuntimeContext";

/**
 * ORDERING-RUNTIME-CONTEXT-1 / ORDERING-RUNTIME-MATERIALIZATION-1 —
 * sole constructor for OrderingRuntimeContext.
 *
 * Construction + immutability only.
 * Does NOT compose sources, apply business defaults, or load data.
 * Input must already be materialized by OrderingRuntimeMaterializer.
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

/**
 * Platform-owned factory — the only allowed construction path for OrderingRuntimeContext.
 */
export class OrderingRuntimeContextFactory {
  /**
   * Construct an immutable OrderingRuntimeContext from materialized input.
   * Structural construction guards only — no business composition.
   */
  create(input: OrderingRuntimeContextInput): OrderingRuntimeContext {
    assertChannel(input.channel);

    if (!Number.isInteger(input.restaurant.id) || input.restaurant.id <= 0) {
      throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.id must be a positive integer");
    }
    if (!input.restaurant.slug?.trim()) {
      throw new OrderingRuntimeContextError("INVALID_RESTAURANT", "restaurant.slug is required");
    }
    if (!input.metadata?.createdAt?.trim() || !input.metadata?.runtimeId?.trim()) {
      throw new OrderingRuntimeContextError(
        "INVALID_METADATA",
        "metadata.createdAt and metadata.runtimeId are required (materializer must supply)"
      );
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
        businessId: input.business.businessId,
        businessDay: input.business.businessDay,
        orderingAvailable: input.business.orderingAvailable,
        closureActive: input.business.closureActive,
        hours: {
          schedule: Object.freeze([...input.business.hours.schedule]),
          isOpenNow: input.business.hours.isOpenNow,
          nextOpenAt: input.business.hours.nextOpenAt,
          nextCloseAt: input.business.hours.nextCloseAt,
        },
      },
      availability: {
        canBrowse: input.availability.canBrowse,
        canPlaceOrder: input.availability.canPlaceOrder,
        reasons: Object.freeze([...input.availability.reasons]),
      },
      locale: {
        language: input.locale.language,
        direction: input.locale.direction,
        theme: input.locale.theme,
      },
      menu: {
        projectionVersion: input.menu.projectionVersion,
        categories: Object.freeze([...input.menu.categories]),
        products: Object.freeze([...input.menu.products]),
        modifiers: Object.freeze([...input.menu.modifiers]),
        offers: Object.freeze([...input.menu.offers]),
        availability: Object.freeze([...input.menu.availability]),
      },
      policies: {
        cartConstraints: Object.freeze({ ...input.policies.cartConstraints }),
        checkoutRules: Object.freeze({ ...input.policies.checkoutRules }),
        guest: {
          guestOrderingEnabled: input.policies.guest.guestOrderingEnabled,
          requireCustomerName: input.policies.guest.requireCustomerName,
          requireCustomerPhone: input.policies.guest.requireCustomerPhone,
          allowSpecialInstructions: input.policies.guest.allowSpecialInstructions,
        },
      },
      pricing: {
        currency: input.pricing.currency,
        taxes: Object.freeze([...input.pricing.taxes]),
        serviceCharge: input.pricing.serviceCharge,
        discountPipeline: Object.freeze([...input.pricing.discountPipeline]),
      },
      capabilities: {
        canBrowseMenu: input.capabilities.canBrowseMenu,
        canAddToCart: input.capabilities.canAddToCart,
        canCheckout: input.capabilities.canCheckout,
        canPlaceOrder: input.capabilities.canPlaceOrder,
        supportedChannels: Object.freeze([...input.capabilities.supportedChannels]),
        notes: {
          supportsOrderNotes: input.capabilities.notes.supportsOrderNotes,
          supportsItemNotes: input.capabilities.notes.supportsItemNotes,
          maxOrderNoteLength: input.capabilities.notes.maxOrderNoteLength,
          maxItemNoteLength: input.capabilities.notes.maxItemNoteLength,
          allowedPolicies: Object.freeze([...input.capabilities.notes.allowedPolicies]),
        },
      },
      orderIdentity: Object.freeze({
        supportedServiceModes: Object.freeze([
          ...(input.orderIdentity?.supportedServiceModes ??
            DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.supportedServiceModes),
        ]),
        supportedFulfilmentAnchorTypes: Object.freeze([
          ...(input.orderIdentity?.supportedFulfilmentAnchorTypes ??
            DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES
              .supportedFulfilmentAnchorTypes),
        ]),
        defaultServiceMode:
          input.orderIdentity?.defaultServiceMode ??
          DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.defaultServiceMode,
      }),
      featureFlags: Object.freeze({ ...input.featureFlags }),
      metadata: {
        schemaVersion: ORDERING_RUNTIME_CONTEXT_SCHEMA_VERSION,
        createdAt: input.metadata.createdAt,
        runtimeId: input.metadata.runtimeId,
      },
    };

    return freezeOrderingRuntimeContext(context);
  }
}

/** Canonical singleton — prefer this over ad-hoc construction. */
export const orderingRuntimeContextFactory = new OrderingRuntimeContextFactory();
