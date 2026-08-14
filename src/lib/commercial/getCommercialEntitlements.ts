import {
  buildCommercialContext,
  commercialContextToResolverInput,
  type CommercialContext,
} from "./commercialContext";
import { resolveCommercialEntitlements } from "./resolveCommercialEntitlements";
import type { CommercialEntitlements } from "./types";

export type CommercialEntitlementsResult = {
  context: CommercialContext;
  entitlements: CommercialEntitlements;
  meta?: {
    commercialResolutionSource?: string;
    commercialPlanId?: string;
    commercialLifecycleState?: string;
    commercialLifecycleReason?: string;
    grandfathered?: boolean;
    commercialName?: string;
    catalogPlanCode?: string | null;
    chargedTerms?: unknown;
  };
};

/**
 * Pure read-only entitlements resolution from a built CommercialContext.
 * No side effects.
 */
export function getCommercialEntitlementsFromContext(
  context: CommercialContext
): CommercialEntitlementsResult {
  const entitlements = resolveCommercialEntitlements(
    commercialContextToResolverInput(context)
  );
  return { context, entitlements };
}

export { buildCommercialContext };
