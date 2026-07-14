import type { OrderingRuntimeContext } from "./orderingRuntimeContract";

function freezeSection<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

/**
 * ORDERING-RUNTIME-CONTEXT-1 — deep-freeze OrderingRuntimeContext for request lifecycle immutability.
 * Used only by OrderingRuntimeContextFactory.
 */
export function freezeOrderingRuntimeContext(
  context: OrderingRuntimeContext
): OrderingRuntimeContext {
  return Object.freeze({
    channel: context.channel,
    restaurant: freezeSection({ ...context.restaurant }),
    business: freezeSection({
      ...context.business,
      hours: freezeSection({
        ...context.business.hours,
        schedule: Object.freeze([...context.business.hours.schedule]),
      }),
    }),
    availability: freezeSection({
      ...context.availability,
      reasons: Object.freeze([...context.availability.reasons]),
    }),
    locale: freezeSection({ ...context.locale }),
    menu: freezeSection({
      ...context.menu,
      categories: Object.freeze([...context.menu.categories]),
      products: Object.freeze([...context.menu.products]),
      modifiers: Object.freeze([...context.menu.modifiers]),
      offers: Object.freeze([...context.menu.offers]),
      availability: Object.freeze([...context.menu.availability]),
    }),
    policies: freezeSection({
      cartConstraints: freezeSection({ ...context.policies.cartConstraints }),
      checkoutRules: freezeSection({ ...context.policies.checkoutRules }),
      guest: freezeSection({ ...context.policies.guest }),
    }),
    pricing: freezeSection({
      ...context.pricing,
      taxes: Object.freeze([...context.pricing.taxes]),
      discountPipeline: Object.freeze([...context.pricing.discountPipeline]),
    }),
    capabilities: freezeSection({
      ...context.capabilities,
      supportedChannels: Object.freeze([...context.capabilities.supportedChannels]),
      notes: freezeSection({
        ...context.capabilities.notes,
        allowedPolicies: Object.freeze([...context.capabilities.notes.allowedPolicies]),
      }),
    }),
    featureFlags: freezeSection({ ...context.featureFlags }),
    metadata: freezeSection({ ...context.metadata }),
  });
}
