import { monthlyEquivalentPlanPrice } from "../../adminKpiCalculations";
import { getSubscriptionPlanById, getSubscriptionPlans } from "../../db";
import { commercialReadService } from "../CommercialReadService";
import type { OwnerCommercialState } from "../commercialReadSlices";
import type { CommercialPlan } from "@commercial/planTypes";

export const CANONICAL_METRICS_SOURCE = "CANONICAL_OWNER" as const;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_DAYS = 30;

export type CanonicalMrrResult = {
  mrr: number;
  metricsSource: typeof CANONICAL_METRICS_SOURCE;
};

export type CanonicalArrResult = {
  arr: number;
  mrr: number;
  arrMethod: "MRR_X12";
  metricsSource: typeof CANONICAL_METRICS_SOURCE;
};

export type PlanDistributionEntry = {
  planCode: CommercialPlan;
  ownerCount: number;
};

export type SubscriberCountsResult = {
  activeSubscriptions: number;
  activeTrials: number;
  entitledOwners: number;
  metricsSource: typeof CANONICAL_METRICS_SOURCE;
};

export type ExpiringAccountsResult = {
  expiringAccounts: number;
  windowDays: number;
  metricsSource: typeof CANONICAL_METRICS_SOURCE;
};

export type DashboardSummaryResult = {
  activeOwners: number;
  activeSubscriptions: number;
  activeTrials: number;
  expiringAccounts: number;
  mrr: number;
  arr: number;
  totalUsers: number;
  totalRestaurants: number;
  activeRestaurants: number;
  metricsSource: typeof CANONICAL_METRICS_SOURCE;
};

/**
 * EXEC-3 / AR-4 Category C — canonical owner-based metrics.
 * Never reads raw subscription row aggregates for product truth.
 */
export class CanonicalMetricsService {
  constructor(
    private readonly readService = commercialReadService
  ) {}

  async loadOwnerStates(now: Date = new Date()): Promise<OwnerCommercialState[]> {
    return this.readService.getAllOwnerCommercialStates(now);
  }

  async getMRR(now: Date = new Date()): Promise<CanonicalMrrResult> {
    const mrr = await this.computeMrrFromStates(await this.loadOwnerStates(now));
    return { mrr, metricsSource: CANONICAL_METRICS_SOURCE };
  }

  async getARR(now: Date = new Date()): Promise<CanonicalArrResult> {
    const mrr = await this.computeMrrFromStates(await this.loadOwnerStates(now));
    return {
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      arrMethod: "MRR_X12",
      metricsSource: CANONICAL_METRICS_SOURCE,
    };
  }

  async getPlanDistribution(
    now: Date = new Date()
  ): Promise<{ distribution: PlanDistributionEntry[]; metricsSource: typeof CANONICAL_METRICS_SOURCE }> {
    const states = await this.loadOwnerStates(now);
    const counts = new Map<CommercialPlan, number>();
    for (const state of states) {
      const code = state.planCode;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    const distribution = [...counts.entries()]
      .map(([planCode, ownerCount]) => ({ planCode, ownerCount }))
      .sort((a, b) => a.planCode.localeCompare(b.planCode));
    return { distribution, metricsSource: CANONICAL_METRICS_SOURCE };
  }

  async getSubscriberCounts(now: Date = new Date()): Promise<SubscriberCountsResult> {
    const states = await this.loadOwnerStates(now);
    return {
      activeSubscriptions: states.filter((s) => s.subscriptionStatus === "active").length,
      activeTrials: states.filter((s) => s.subscriptionStatus === "trial").length,
      entitledOwners: states.filter((s) => s.commercialStatus.isEntitled).length,
      metricsSource: CANONICAL_METRICS_SOURCE,
    };
  }

  async getExpiringAccounts(now: Date = new Date()): Promise<ExpiringAccountsResult> {
    const states = await this.loadOwnerStates(now);
    const threshold = now.getTime() + EXPIRING_SOON_DAYS * MS_PER_DAY;
    const expiringAccounts = states.filter((state) => {
      if (!state.commercialStatus.isEntitled) return false;
      if (state.subscriptionStatus !== "active" && state.subscriptionStatus !== "trial") {
        return false;
      }
      const end = state.currentPeriodEnd ?? state.trialStatus.trialEndsAt;
      if (!end) return false;
      const endMs = new Date(end).getTime();
      if (Number.isNaN(endMs)) return false;
      return endMs >= now.getTime() && endMs <= threshold;
    }).length;

    return {
      expiringAccounts,
      windowDays: EXPIRING_SOON_DAYS,
      metricsSource: CANONICAL_METRICS_SOURCE,
    };
  }

  async getDashboardSummary(
    entityCounts: {
      totalUsers: number;
      totalRestaurants: number;
      activeRestaurants: number;
    },
    now: Date = new Date()
  ): Promise<DashboardSummaryResult> {
    const states = await this.loadOwnerStates(now);
    const mrr = await this.computeMrrFromStates(states);
    const subscriberCounts = this.subscriberCountsFromStates(states);
    const expiring = this.expiringFromStates(states, now);

    return {
      activeOwners: states.filter((s) => s.commercialStatus.isEntitled).length,
      activeSubscriptions: subscriberCounts.activeSubscriptions,
      activeTrials: subscriberCounts.activeTrials,
      expiringAccounts: expiring,
      mrr,
      arr: Math.round(mrr * 12 * 100) / 100,
      totalUsers: entityCounts.totalUsers,
      totalRestaurants: entityCounts.totalRestaurants,
      activeRestaurants: entityCounts.activeRestaurants,
      metricsSource: CANONICAL_METRICS_SOURCE,
    };
  }

  private subscriberCountsFromStates(states: OwnerCommercialState[]) {
    return {
      activeSubscriptions: states.filter((s) => s.subscriptionStatus === "active").length,
      activeTrials: states.filter((s) => s.subscriptionStatus === "trial").length,
    };
  }

  private expiringFromStates(states: OwnerCommercialState[], now: Date): number {
    const threshold = now.getTime() + EXPIRING_SOON_DAYS * MS_PER_DAY;
    return states.filter((state) => {
      if (!state.commercialStatus.isEntitled) return false;
      if (state.subscriptionStatus !== "active" && state.subscriptionStatus !== "trial") {
        return false;
      }
      const end = state.currentPeriodEnd ?? state.trialStatus.trialEndsAt;
      if (!end) return false;
      const endMs = new Date(end).getTime();
      if (Number.isNaN(endMs)) return false;
      return endMs >= now.getTime() && endMs <= threshold;
    }).length;
  }

  private async computeMrrFromStates(states: OwnerCommercialState[]): Promise<number> {
    const plans = await getSubscriptionPlans();
    const planRows = plans.map((p) => ({
      id: p.id,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
    }));

    let total = 0;
    for (const state of states) {
      if (!state.commercialStatus.countsInMrr || state.planId == null) continue;
      const plan =
        planRows.find((p) => p.id === state.planId) ??
        (await getSubscriptionPlanById(state.planId));
      if (!plan) continue;
      total += monthlyEquivalentPlanPrice(
        { billingCycle: state.billingCycle ?? "monthly" },
        {
          id: plan.id,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly ?? null,
        }
      );
    }
    return Math.round(total * 100) / 100;
  }
}

export const canonicalMetricsService = new CanonicalMetricsService();
