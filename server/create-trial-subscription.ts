import {
  createUserSubscription,
  getSubscriptionPlans,
} from "./db";
import { InsertUserSubscription } from "../drizzle/schema";

const TRIAL_DAYS = 14;

/** Plan used for new trials: first active paid-tier plan, excluding ordering-only free tier. */
export async function resolveTrialPlanId(): Promise<number> {
  const plans = await getSubscriptionPlans();
  const paid = plans.find((p) => p.id !== 30001);
  if (paid) return paid.id;
  if (plans[0]) return plans[0].id;
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
