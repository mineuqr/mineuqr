import { randomUUID } from "node:crypto";
import { ORDERING_CHANNEL_IDS } from "@shared/ordering-platform/orderingPlatformContracts";
import type { OrderingRuntimeContextInput } from "@shared/ordering-platform/orderingRuntimeContract";
import type { OrderingRuntimeMaterializationRequest } from "@shared/ordering-platform/orderingRuntimeMaterializationContract";
import type { OrderingRuntimeContext } from "@shared/ordering-platform/orderingRuntimeContract";
import { DEFAULT_ORDERING_NOTES_CAPABILITIES } from "@shared/ordering-platform/orderingNotesContract";
import { DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES } from "@shared/ordering-platform/orderingIdentityContract";
import {
  OrderingRuntimeContextFactory,
  orderingRuntimeContextFactory,
} from "./OrderingRuntimeContextFactory";

/**
 * ORDERING-RUNTIME-MATERIALIZATION-1 — sole runtime composition layer.
 *
 * Collect → Validate → Normalize → Compose → Factory.create
 * Does not load from DB (source bag is supplied by future loaders/repositories).
 * Factory must never perform this composition.
 */

export class OrderingRuntimeMaterializationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OrderingRuntimeMaterializationError";
    this.code = code;
  }
}

const CHANNEL_SET = new Set<string>(ORDERING_CHANNEL_IDS);

export type OrderingRuntimeMaterializerDeps = {
  factory?: OrderingRuntimeContextFactory;
};

/**
 * Canonical Ordering Runtime Materializer — platform-owned composition boundary.
 */
export class OrderingRuntimeMaterializer {
  private readonly factory: OrderingRuntimeContextFactory;

  constructor(deps: OrderingRuntimeMaterializerDeps = {}) {
    this.factory = deps.factory ?? orderingRuntimeContextFactory;
  }

  /**
   * Compose authoritative sources into an immutable OrderingRuntimeContext.
   */
  materialize(request: OrderingRuntimeMaterializationRequest): OrderingRuntimeContext {
    const input = this.composeInput(request);
    return this.factory.create(input);
  }

  /**
   * Collect → validate → normalize → compose canonical factory input.
   * Exposed for regression tests of the composition pipeline.
   */
  composeInput(request: OrderingRuntimeMaterializationRequest): OrderingRuntimeContextInput {
    this.validateSources(request);
    return this.normalizeAndCompose(request);
  }

  /** Validation pipeline — consistency before composition. */
  private validateSources(request: OrderingRuntimeMaterializationRequest): void {
    if (!CHANNEL_SET.has(request.channel)) {
      throw new OrderingRuntimeMaterializationError(
        "INVALID_CHANNEL",
        `Unknown ordering channel: ${request.channel}`
      );
    }

    const r = request.restaurant;
    if (!Number.isInteger(r.id) || r.id <= 0) {
      throw new OrderingRuntimeMaterializationError(
        "INVALID_RESTAURANT",
        "restaurant.id must be a positive integer"
      );
    }
    if (!r.slug?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_RESTAURANT", "restaurant.slug is required");
    }
    if (!r.name?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_RESTAURANT", "restaurant.name is required");
    }
    if (!r.currency?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_RESTAURANT", "restaurant.currency is required");
    }
    if (!r.timezone?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_RESTAURANT", "restaurant.timezone is required");
    }

    if (!request.business.businessDay?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_BUSINESS", "business.businessDay is required");
    }
    if (!request.menu.projectionVersion?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_MENU", "menu.projectionVersion is required");
    }
    if (!request.pricing.currency?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_PRICING", "pricing.currency is required");
    }
    if (!request.locale.language?.trim()) {
      throw new OrderingRuntimeMaterializationError("INVALID_LOCALE", "locale.language is required");
    }
    if (request.locale.direction !== "ltr" && request.locale.direction !== "rtl") {
      throw new OrderingRuntimeMaterializationError("INVALID_LOCALE", "locale.direction must be ltr or rtl");
    }

    if (
      request.pricing.currency.trim().toUpperCase() !==
      request.restaurant.currency.trim().toUpperCase()
    ) {
      throw new OrderingRuntimeMaterializationError(
        "CURRENCY_MISMATCH",
        "pricing.currency must match restaurant.currency"
      );
    }

    if (request.capabilities?.supportedChannels) {
      for (const ch of request.capabilities.supportedChannels) {
        if (!CHANNEL_SET.has(ch)) {
          throw new OrderingRuntimeMaterializationError(
            "INVALID_CAPABILITIES",
            `Unknown supported channel: ${ch}`
          );
        }
      }
      if (!request.capabilities.supportedChannels.includes(request.channel)) {
        throw new OrderingRuntimeMaterializationError(
          "CHANNEL_NOT_SUPPORTED",
          `channel ${request.channel} is not listed in capabilities.supportedChannels`
        );
      }
    }
  }

  /** Normalization + composition pipeline → OrderingRuntimeContextInput. */
  private normalizeAndCompose(
    request: OrderingRuntimeMaterializationRequest
  ): OrderingRuntimeContextInput {
    const reasons = [...(request.availability.reasons ?? [])];
    if (request.business.closureActive && !reasons.includes("closure_active")) {
      reasons.push("closure_active");
    }
    if (!request.business.orderingAvailable && !reasons.includes("ordering_unavailable")) {
      reasons.push("ordering_unavailable");
    }
    if (!request.hours.isOpenNow && !reasons.includes("outside_business_hours")) {
      reasons.push("outside_business_hours");
    }

    const canBrowse = Boolean(request.availability.canBrowse);
    const hoursOpen = Boolean(request.hours.isOpenNow);
    const canPlaceOrder =
      Boolean(request.availability.canPlaceOrder) &&
      Boolean(request.business.orderingAvailable) &&
      !request.business.closureActive &&
      hoursOpen;

    const cartConstraints = {
      ...(request.policies.cartConstraints ?? {}),
      ...(request.channelPolicies?.cartConstraints ?? {}),
    };
    const checkoutRules = {
      ...(request.policies.checkoutRules ?? {}),
      ...(request.channelPolicies?.checkoutRules ?? {}),
    };

    const supportedChannels = request.capabilities?.supportedChannels?.length
      ? [...request.capabilities.supportedChannels]
      : [request.channel];

    const guestEnabled = Boolean(request.policies.guest.guestOrderingEnabled);
    const allowSpecialInstructions =
      request.policies.guest.allowSpecialInstructions !== false;
    const notesCapabilities = {
      supportsOrderNotes:
        request.capabilities?.notes?.supportsOrderNotes ?? allowSpecialInstructions,
      supportsItemNotes:
        request.capabilities?.notes?.supportsItemNotes ?? allowSpecialInstructions,
      maxOrderNoteLength:
        request.capabilities?.notes?.maxOrderNoteLength ??
        DEFAULT_ORDERING_NOTES_CAPABILITIES.maxOrderNoteLength,
      maxItemNoteLength:
        request.capabilities?.notes?.maxItemNoteLength ??
        DEFAULT_ORDERING_NOTES_CAPABILITIES.maxItemNoteLength,
      allowedPolicies: [
        ...(request.capabilities?.notes?.allowedPolicies ??
          DEFAULT_ORDERING_NOTES_CAPABILITIES.allowedPolicies),
      ],
    };

    return {
      channel: request.channel,
      restaurant: {
        id: request.restaurant.id,
        slug: request.restaurant.slug.trim(),
        name: request.restaurant.name.trim(),
        currency: request.restaurant.currency.trim().toUpperCase(),
        timezone: request.restaurant.timezone.trim(),
      },
      business: {
        businessId: request.business.businessId ?? null,
        businessDay: request.business.businessDay.trim(),
        orderingAvailable: Boolean(request.business.orderingAvailable),
        closureActive: Boolean(request.business.closureActive),
        hours: {
          schedule: [...(request.hours.schedule ?? [])],
          isOpenNow: Boolean(request.hours.isOpenNow),
          nextOpenAt: request.hours.nextOpenAt ?? null,
          nextCloseAt: request.hours.nextCloseAt ?? null,
        },
      },
      availability: {
        canBrowse,
        canPlaceOrder: canBrowse && canPlaceOrder,
        reasons,
      },
      locale: {
        language: request.locale.language.trim(),
        direction: request.locale.direction,
        theme: request.locale.theme ?? null,
      },
      menu: {
        projectionVersion: request.menu.projectionVersion.trim(),
        categories: [...(request.menu.categories ?? [])],
        products: [...(request.menu.products ?? [])],
        modifiers: [...(request.menu.modifiers ?? [])],
        offers: [...(request.menu.offers ?? [])],
        availability: [...(request.menu.availability ?? [])],
      },
      policies: {
        cartConstraints,
        checkoutRules,
        guest: {
          guestOrderingEnabled: guestEnabled,
          requireCustomerName: Boolean(request.policies.guest.requireCustomerName),
          requireCustomerPhone: Boolean(request.policies.guest.requireCustomerPhone),
          allowSpecialInstructions,
        },
      },
      pricing: {
        currency: request.pricing.currency.trim().toUpperCase(),
        taxes: [...(request.pricing.taxes ?? [])],
        serviceCharge: request.pricing.serviceCharge ?? null,
        discountPipeline: [...(request.pricing.discountPipeline ?? [])],
      },
      capabilities: {
        canBrowseMenu: request.capabilities?.canBrowseMenu ?? canBrowse,
        canAddToCart: request.capabilities?.canAddToCart ?? (canBrowse && guestEnabled),
        canCheckout: request.capabilities?.canCheckout ?? canPlaceOrder,
        canPlaceOrder: request.capabilities?.canPlaceOrder ?? canPlaceOrder,
        supportedChannels,
        notes: notesCapabilities,
      },
      // ORDER-IDENTITY-RUNTIME-1 — foundation defaults (table_service + table only).
      orderIdentity: {
        supportedServiceModes: [
          ...DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.supportedServiceModes,
        ],
        supportedFulfilmentAnchorTypes: [
          ...DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.supportedFulfilmentAnchorTypes,
        ],
        defaultServiceMode:
          DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.defaultServiceMode,
      },
      featureFlags: { ...(request.featureFlags ?? {}) },
      metadata: {
        createdAt: (request.now ?? new Date()).toISOString(),
        runtimeId: request.runtimeId?.trim() || randomUUID(),
      },
    };
  }
}

/** Canonical singleton — prefer this over ad-hoc materialization. */
export const orderingRuntimeMaterializer = new OrderingRuntimeMaterializer();
