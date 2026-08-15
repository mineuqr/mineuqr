/**
 * Create a trial subscription for a new user.
 * COMMERCIAL-CATALOG-PLATFORM-ADOPTION-1 — trial duration + plan from Catalog SSOT.
 * Legacy planId retained for payment/activation compatibility bridge only.
 */
import { createUserSubscription } from "./db";
import { InsertUserSubscription } from "../drizzle/schema";
import {
  resolveTrialPolicyFromCatalog,
  bindSubscriptionToLivePlan,
  ensureCatalogReady,
  resolveLegacyPlanIdFromPlan,
} from "./services/commercial-catalog";
import { commercialAdoptionObservability } from "./services/commercial-catalog/adoptionObservability";

/** @deprecated Catalog trial policy is SSOT — kept as fallback only. */
export const TRIAL_DAYS = 14;

/** @deprecated Prefer Catalog professional plan version. */
export const TRIAL_PLAN_SORT_ORDER = 2;

/**
 * Plan for new trials — Catalog SSOT with legacy bridge fallback.
 */
export async function resolveTrialPlanId(): Promise<string> {
  await ensureCatalogReady();
  const policy = await resolveTrialPolicyFromCatalog();
  if (!policy.professionalPlanId) {
    throw new Error("trial_plan_unresolved");
  }
  return policy.professionalPlanId;
}

export async function resolveTrialDurationDays(): Promise<number> {
  try {
    const policy = await resolveTrialPolicyFromCatalog();
    return policy.durationDays;
  } catch {
    commercialAdoptionObservability.recordLegacyLookup("resolveTrialDurationDays");
    return TRIAL_DAYS;
  }
}

export function buildTrialSubscriptionPayload(
  userId: number,
  planId: string,
  restaurantId = 0,
  trialDays = TRIAL_DAYS
): InsertUserSubscription {
  const now = new Date();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + trialDays);

  return {
    userId,
    restaurantId,
    planId,
    status: "trial",
    billingCycle: "monthly",
    currentPeriodStart: now.toISOString(),
    currentPeriodEnd: currentPeriodEnd.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
  };
}

/** Shared trial row payload (register transaction + createTrialSubscription). */
export async function buildTrialSubscriptionForUser(
  userId: number,
  restaurantId = 0
): Promise<InsertUserSubscription> {
  const planId = await resolveTrialPlanId();
  const days = await resolveTrialDurationDays();
  return buildTrialSubscriptionPayload(userId, planId, restaurantId, days);
}

/**
 * Create a trial subscription for a new user (account-scoped by default).
 * Binds the trial subscription to the live Professional plan.
 */
export async function createTrialSubscription(
  userId: number,
  options?: { restaurantId?: number }
): Promise<void> {
  const restaurantId = options?.restaurantId ?? 0;
  const trialSubscription = await buildTrialSubscriptionForUser(
    userId,
    restaurantId
  );

  const created = await createUserSubscription(trialSubscription);
  const subscriptionId = created?.id ?? null;

  try {
    await ensureCatalogReady();
    const policy = await resolveTrialPolicyFromCatalog();
    if (subscriptionId && policy.professionalPlanId) {
      await bindSubscriptionToLivePlan({
        subscriptionId,
        planId: policy.professionalPlanId,
        legacyPlanId: resolveLegacyPlanIdFromPlan(trialSubscription.planId),
        event: "trial_activated",
        actorId: userId,
      });
    }
  } catch {
    commercialAdoptionObservability.recordResolutionError(
      "trial_snapshot_capture_failed"
    );
  }

  const days = await resolveTrialDurationDays();
  console.log(
    `[Trial] Created ${days}-day trial for user ${userId} (restaurant ${restaurantId}, plan ${trialSubscription.planId})`
  );
}
