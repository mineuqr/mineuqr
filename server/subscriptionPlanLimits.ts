import { TRPCError } from "@trpc/server";
import type { SelectSubscriptionPlan } from "../drizzle/schema";
import {
  getRestaurantStats,
  getRestaurantsByUser,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  getSubscriptionsByUser,
} from "./db";
import { resolveSubscriptionEntitlement } from "./subscriptionEntitlement";
import {
  pickCanonicalSubscription,
  resolveOrderingSubscriptionRow,
} from "./subscriptionResolver";
import {
  getSubscriptionCommercialBinding,
  resolveLivePlanCapabilities,
} from "./services/commercial-catalog";
import { commercialRuntimeAuthorityObservability } from "./services/commercial-catalog/runtimeAuthorityObservability";

export type PlanLimits = Pick<
  SelectSubscriptionPlan,
  "maxRestaurants" | "maxItemsPerRestaurant" | "maxCategories"
>;

const DEFAULT_LIMITS: PlanLimits = {
  maxRestaurants: 1,
  maxItemsPerRestaurant: 100,
  maxCategories: 10,
};

function livePlanQuotaLimits(
  limits: { limitKey: string; value: number | null }[]
): PlanLimits {
  const map = new Map(limits.map((l) => [l.limitKey, l.value] as const));
  return {
    maxRestaurants: map.get("restaurants") ?? 0,
    maxItemsPerRestaurant: map.get("items") ?? 0,
    maxCategories: map.get("categories") ?? 0,
  };
}

async function getFallbackBasicLimits(): Promise<PlanLimits> {
  const plans = await getSubscriptionPlans();
  const basic =
    plans.find((p) => p.maxRestaurants === 1) ??
    plans.sort((a, b) => a.maxRestaurants - b.maxRestaurants)[0];
  if (!basic) return DEFAULT_LIMITS;
  return {
    maxRestaurants: basic.maxRestaurants,
    maxItemsPerRestaurant: basic.maxItemsPerRestaurant,
    maxCategories: basic.maxCategories,
  };
}

/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Bound subscription → current live plan limits.
 * Unbound → Legacy subscription_plans bridge ONLY.
 */
export async function resolvePlanLimitsForUser(
  userId: number,
  restaurantId?: number
): Promise<PlanLimits> {
  const rows = await getSubscriptionsByUser(userId);
  const sub =
    restaurantId != null
      ? resolveOrderingSubscriptionRow(restaurantId, rows)
      : pickCanonicalSubscription(rows);

  if (sub && resolveSubscriptionEntitlement(sub).isEntitled) {
    const binding = await getSubscriptionCommercialBinding(sub.id);
    if (binding) {
      const facts = await resolveLivePlanCapabilities(sub.id);
      if (facts.source === "live_plan") {
        commercialRuntimeAuthorityObservability.recordLivePlanResolved(sub.id);
        return livePlanQuotaLimits(facts.limits);
      }
      commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
        `quota_bound_live_plan_unreadable:${binding.planId}`
      );
      return { maxRestaurants: 0, maxItemsPerRestaurant: 0, maxCategories: 0 };
    }

    commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
      "resolvePlanLimitsForUser"
    );
    const plan = await getSubscriptionPlanById(sub.planId);
    if (plan) {
      return {
        maxRestaurants: plan.maxRestaurants,
        maxItemsPerRestaurant: plan.maxItemsPerRestaurant,
        maxCategories: plan.maxCategories,
      };
    }
  }

  commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
    "resolvePlanLimitsForUser:fallback"
  );
  return getFallbackBasicLimits();
}

function locationWord(max: number): string {
  return max === 1 ? "موقع" : "مواقع";
}

export async function assertRestaurantCreateAllowed(userId: number): Promise<void> {
  const restaurants = await getRestaurantsByUser(userId);
  const limits = await resolvePlanLimitsForUser(userId);
  if (restaurants.length >= limits.maxRestaurants) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${limits.maxRestaurants} ${locationWord(limits.maxRestaurants)}.`,
    });
  }
}

export async function assertCategoryCreateAllowed(
  userId: number,
  restaurantId: number
): Promise<void> {
  const limits = await resolvePlanLimitsForUser(userId, restaurantId);
  const stats = await getRestaurantStats(restaurantId);
  if (stats.totalCategories >= limits.maxCategories) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${limits.maxCategories} فئات لهذا الموقع.`,
    });
  }
}

export async function assertMenuItemCreateAllowed(
  userId: number,
  restaurantId: number
): Promise<void> {
  const limits = await resolvePlanLimitsForUser(userId, restaurantId);
  const stats = await getRestaurantStats(restaurantId);
  if (stats.totalItems >= limits.maxItemsPerRestaurant) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${limits.maxItemsPerRestaurant} أصناف لهذا الموقع.`,
    });
  }
}
