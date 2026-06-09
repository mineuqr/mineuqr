import type { AccountType, CatalogPlan, CommercialPlan } from "./planTypes";
import {
  getCommercialFlagsForPlan,
  getFeaturesForPlan,
  getLimitsForPlan,
} from "./planFeatureMatrix";
import type {
  CommercialEntitlements,
  CommercialSubscriptionSnapshot,
  ResolveCommercialEntitlementsInput,
} from "./types";

function parseInstant(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPeriodValid(
  end: string | Date | null | undefined,
  now: Date
): boolean {
  const instant = parseInstant(end);
  if (instant == null) return false;
  return now < instant;
}

function resolveAccountType(plan: CommercialPlan): AccountType {
  switch (plan) {
    case "ADMIN":
      return "ADMIN";
    case "TRIAL":
      return "TRIAL";
    case "BASIC":
    case "PROFESSIONAL":
    case "ENTERPRISE":
      return "PAYING";
    default:
      return "NONE";
  }
}

function resolveCommercialPlan(
  input: ResolveCommercialEntitlementsInput
): { plan: CommercialPlan; status: CommercialEntitlements["status"] } {
  const subscription = input.subscription;
  if (!subscription) {
    return { plan: "NONE", status: null };
  }

  const now = input.now ?? new Date();
  const { status } = subscription;

  if (status === "canceled" || status === "expired") {
    return { plan: "NONE", status };
  }

  if (status === "trial") {
    if (!isPeriodValid(subscription.trialEndsAt, now)) {
      return { plan: "NONE", status: "trial" };
    }
    return { plan: "TRIAL", status: "trial" };
  }

  if (status === "active") {
    if (!isPeriodValid(subscription.currentPeriodEnd, now)) {
      return { plan: "NONE", status: "active" };
    }
    return {
      plan: subscription.catalogPlan,
      status: "active",
    };
  }

  return { plan: "NONE", status };
}

function buildEntitlementsForPlan(
  plan: CommercialPlan,
  status: CommercialEntitlements["status"]
): CommercialEntitlements {
  return {
    accountType: resolveAccountType(plan),
    plan,
    status,
    limits: getLimitsForPlan(plan),
    features: getFeaturesForPlan(plan),
    commercial: getCommercialFlagsForPlan(plan),
  };
}

/**
 * Single commercial authority resolver (PG-1C.1A / PG-1C.1B).
 * Pure function — no database access in PG-1C.2B foundation phase.
 */
export function resolveCommercialEntitlements(
  input: ResolveCommercialEntitlementsInput
): CommercialEntitlements {
  const { plan, status } = resolveCommercialPlan(input);
  return buildEntitlementsForPlan(plan, status);
}

/** Convenience helper for tests and future wiring. */
export function resolveCommercialEntitlementsForCatalogPlan(
  catalogPlan: CatalogPlan,
  options?: {
    role?: ResolveCommercialEntitlementsInput["role"];
    now?: Date;
    currentPeriodEnd?: string | Date;
  }
): CommercialEntitlements {
  const now = options?.now ?? new Date();
  const periodEnd =
    options?.currentPeriodEnd ??
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return resolveCommercialEntitlements({
    ownerId: 0,
    role: options?.role,
    subscription: {
      catalogPlan,
      status: "active",
      currentPeriodEnd: periodEnd,
    },
    now,
  });
}
