/**
 * COMMERCIAL-ONBOARDING-OCCUPANCY-INVARIANT-1
 *
 * First-restaurant onboarding is a bootstrap create (new owner occupancy 0→1)
 * inside a larger user+restaurant+trial transaction. The occupancy helper
 * always opens its own transaction and cannot join that boundary, and
 * checkLimit requires a persisted owner subscription that does not exist yet.
 *
 * Commercial still owns the capacity decision: the trial/onboarding plan must
 * permit proposedTotal = 1. Missing, invalid, or unresolvable capacity fails
 * closed. This is not a second limiter and does not replace occupancy for
 * subsequent restaurant creates.
 */

import {
  listLivePlanOfferings,
  resolveTrialPolicyFromCatalog,
} from "../services/commercial-catalog";
import {
  CommercialLimitExceededError,
  CommercialOccupancyUnavailableError,
} from "./commercialLimitOccupancy";
import type { LimitDecision } from "./enforcement";

export const ONBOARDING_RESTAURANT_LIMIT_KEY = "restaurants" as const;
export const ONBOARDING_FIRST_RESTAURANT_PROPOSED_TOTAL = 1;

function denied(input: {
  reasonCode: string;
  cap: number | null;
  proposedTotal: number;
  source: string;
}): LimitDecision {
  return {
    allowed: false,
    reasonCode: input.reasonCode,
    limitKey: ONBOARDING_RESTAURANT_LIMIT_KEY,
    cap: input.cap,
    proposedTotal: input.proposedTotal,
    policy: "denied",
    source: input.source,
  };
}

/**
 * Pure Commercial decision for first-restaurant onboarding.
 *
 * Catalog unlimited is `cap === null` with the restaurants key present.
 * A missing key is not unlimited.
 */
export function decideOnboardingRestaurantCapacity(input: {
  cap: number | null | undefined;
  restaurantsKeyPresent: boolean;
  proposedTotal?: number;
  source?: string;
}): LimitDecision {
  const proposedTotal =
    input.proposedTotal ?? ONBOARDING_FIRST_RESTAURANT_PROPOSED_TOTAL;
  const source = input.source ?? "onboarding_trial_plan";

  if (!input.restaurantsKeyPresent || input.cap === undefined) {
    return denied({
      reasonCode: "limit_unavailable",
      cap: null,
      proposedTotal,
      source,
    });
  }

  if (input.cap === null) {
    return {
      allowed: true,
      reasonCode: "unlimited",
      limitKey: ONBOARDING_RESTAURANT_LIMIT_KEY,
      cap: null,
      proposedTotal,
      policy: "unlimited",
      source,
    };
  }

  if (
    typeof input.cap !== "number" ||
    !Number.isFinite(input.cap) ||
    !Number.isInteger(input.cap) ||
    input.cap < 0
  ) {
    return denied({
      reasonCode: "limit_unavailable",
      cap: null,
      proposedTotal,
      source,
    });
  }

  const allowed = proposedTotal <= input.cap;
  return {
    allowed,
    reasonCode: allowed ? "within_limit" : "limit_exceeded",
    limitKey: ONBOARDING_RESTAURANT_LIMIT_KEY,
    cap: input.cap,
    proposedTotal,
    policy: "hard",
    source,
  };
}

export async function resolveOnboardingRestaurantCapacity(): Promise<LimitDecision> {
  let policy: Awaited<ReturnType<typeof resolveTrialPolicyFromCatalog>>;
  try {
    policy = await resolveTrialPolicyFromCatalog();
  } catch {
    throw new CommercialOccupancyUnavailableError(
      "onboarding_trial_plan_unresolved"
    );
  }

  if (!policy.professionalPlanId) {
    throw new CommercialOccupancyUnavailableError(
      "onboarding_trial_plan_unresolved"
    );
  }

  let offerings: Awaited<ReturnType<typeof listLivePlanOfferings>>;
  try {
    offerings = await listLivePlanOfferings();
  } catch {
    throw new CommercialOccupancyUnavailableError(
      "onboarding_trial_plan_unreadable"
    );
  }

  const offering = offerings.find(
    (row) => row.planId === policy.professionalPlanId
  );
  if (!offering) {
    throw new CommercialOccupancyUnavailableError(
      "onboarding_trial_plan_unreadable"
    );
  }

  const row = offering.limits.find(
    (limit) => limit.limitKey === ONBOARDING_RESTAURANT_LIMIT_KEY
  );
  return decideOnboardingRestaurantCapacity({
    cap: row ? row.value : undefined,
    restaurantsKeyPresent: row != null,
    proposedTotal: ONBOARDING_FIRST_RESTAURANT_PROPOSED_TOTAL,
    source: "onboarding_trial_plan",
  });
}

export async function assertOnboardingFirstRestaurantPermitted(): Promise<LimitDecision> {
  const decision = await resolveOnboardingRestaurantCapacity();
  if (!decision.allowed) {
    throw new CommercialLimitExceededError(
      decision.reasonCode,
      decision.cap ?? 0
    );
  }
  return decision;
}
