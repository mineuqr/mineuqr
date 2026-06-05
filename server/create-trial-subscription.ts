import {
  createUserSubscription,
  getSubscriptionPlans,
} from "./db";
import { InsertUserSubscription } from "../drizzle/schema";

export const TRIAL_DAYS = 14;

/** Professional tier in seeded catalog (Basic=1, Professional=2, Enterprise=3). */
export const TRIAL_PLAN_SORT_ORDER = 2;

/** Free ordering-only tier — never used for self-service trials. */
const ORDERING_FREE_PLAN_ID = 30001;

/**
 * Plan for new trials (LAUNCH-5B): Professional tier limits/features, 14-day lifecycle.
 * Falls back to second paid catalog row if sortOrder 2 is absent.
 */
export async function resolveTrialPlanId(): Promise<number> {
  const plans = await getSubscriptionPlans();
  const paid = plans.filter((p) => p.id !== ORDERING_FREE_PLAN_ID);
  const professional = paid.find((p) => p.sortOrder === TRIAL_PLAN_SORT_ORDER);
  if (professional) return professional.id;
  if (paid[1]) return paid[1].id;
  if (paid[0]) return paid[0].id;
  return 1;
}

export function buildTrialSubscriptionPayload(
  userId: number,
  planId: number,
  restaurantId = 0
): InsertUserSubscription {
  const now = new Date();
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setDate(currentPeriodEnd.getDate() + TRIAL_DAYS);

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
  return buildTrialSubscriptionPayload(userId, planId, restaurantId);
}

/**
 * Create a 14-day trial subscription for a new user.
 * @param restaurantId — when set, trial is scoped to that restaurant (self-service register).
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

  await createUserSubscription(trialSubscription);
  console.log(
    `[Trial] Created ${TRIAL_DAYS}-day trial for user ${userId} (restaurant ${restaurantId}, plan ${trialSubscription.planId})`
  );
}
