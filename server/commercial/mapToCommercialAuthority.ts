import type { CommercialEntitlementsResult } from "./getCommercialEntitlements";
import type { CommercialAuthority } from "./dto/commercialAuthority";
import { COMMERCIAL_AUTHORITY_SOURCE } from "./dto/commercialAuthority";
import type { UserSubscriptionRow } from "../subscriptionResolver";
import type { SelectSubscriptionPlan } from "../../drizzle/schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toIsoString(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function computeDaysRemaining(trialEndsAt: string | null, now: Date): number | null {
  if (!trialEndsAt) return null;
  const end = new Date(trialEndsAt).getTime();
  if (Number.isNaN(end)) return null;
  const diff = end - now.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}

function resolvePlanName(plan: SelectSubscriptionPlan | null | undefined): string | null {
  if (!plan) return null;
  return plan.nameEn || plan.nameAr || null;
}

/**
 * Maps canonical entitlements result + account-scoped row metadata to CommercialAuthority.
 * Pure function — no additional authority selection.
 */
export function mapToCommercialAuthority(
  result: CommercialEntitlementsResult,
  canonicalRow: UserSubscriptionRow | undefined,
  catalogPlan: SelectSubscriptionPlan | null | undefined,
  now: Date
): CommercialAuthority {
  const { context, entitlements } = result;
  const trialEndsAt = toIsoString(
    canonicalRow?.trialEndsAt ?? context.subscription?.trialEndsAt ?? null
  );
  const currentPeriodEnd = toIsoString(
    canonicalRow?.currentPeriodEnd ?? context.subscription?.currentPeriodEnd ?? null
  );

  const isEntitled = entitlements.plan !== "NONE";

  return {
    ownerId: context.ownerId,
    role: context.role,

    subscriptionId: canonicalRow?.id ?? null,
    subscriptionStatus: entitlements.status,

    planId: canonicalRow?.planId ?? null,
    planCode: entitlements.plan,
    planName: resolvePlanName(catalogPlan),

    trialStatus: {
      isTrial: entitlements.commercial.isTrial,
      trialEndsAt,
      daysRemaining: entitlements.commercial.isTrial
        ? computeDaysRemaining(trialEndsAt, now)
        : null,
    },

    maxRestaurants: entitlements.limits.restaurants,

    features: entitlements.features,

    entitlements,

    commercialStatus: {
      accountType: entitlements.accountType,
      isPaid: entitlements.commercial.isPaid,
      isEntitled,
      countsInMrr: entitlements.commercial.countsInMrr,
      countsInRevenue: entitlements.commercial.countsInRevenue,
      invoiceEligible: entitlements.commercial.invoiceEligible,
    },

    currentPeriodEnd,
    billingCycle: canonicalRow?.billingCycle ?? null,

    authoritySource: COMMERCIAL_AUTHORITY_SOURCE,
    resolvedAt: now.toISOString(),
  };
}
