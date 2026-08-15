import { commercialReadService } from "../CommercialReadService";
import { COMMERCIAL_AUTHORITY_SOURCE } from "../dto/commercialAuthority";
import type { OwnerCommercialState } from "../commercialReadSlices";
import type { CommercialPlan } from "@commercial/planTypes";
import {
  computeMrrFromChargedTerms,
  loadChargedTermsForMrr,
  type ChargedTermsMrrRow,
} from "./chargedTermsMrr";
import {
  COMMERCIAL_OVERVIEW_ASSEMBLER,
  COMMERCIAL_OVERVIEW_SCHEMA_VERSION,
  type CommercialOverviewEntityCounts,
  type CommercialOverviewSnapshot,
} from "./CommercialOverviewSnapshot";

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
export type LoadChargedTermsForMrr = (
  subscriptionIds: number[]
) => Promise<ChargedTermsMrrRow[]>;

export class CanonicalMetricsService {
  constructor(
    private readonly readService = commercialReadService,
    private readonly loadChargedTerms: LoadChargedTermsForMrr = loadChargedTermsForMrr
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
    return {
      distribution: this.planDistributionFromStates(states),
      metricsSource: CANONICAL_METRICS_SOURCE,
    };
  }

  /**
   * EXEC-7C.2 — single canonical snapshot for /admin/commercial.
   * One CRS load, one asOf; composes existing metric derivations only.
   */
  async getCommercialOverviewSnapshot(
    entityCounts: CommercialOverviewEntityCounts,
    now: Date = new Date()
  ): Promise<CommercialOverviewSnapshot> {
    const generatedAt = new Date().toISOString();
    const asOf = now.toISOString();
    const states = await this.loadOwnerStates(now);
    const subscriberCounts = this.subscriberCountsFromStates(states);
    const entitledOwners = states.filter((s) => s.commercialStatus.isEntitled).length;
    const mrr = await this.computeMrrFromStates(states);
    const arr = Math.round(mrr * 12 * 100) / 100;
    const health = this.subscriptionHealthFromStates(states);
    const expiringWithin30Days = this.expiringFromStates(states, now);

    return {
      generatedAt,
      asOf,
      metadata: {
        generatedAt,
        asOf,
        schemaVersion: COMMERCIAL_OVERVIEW_SCHEMA_VERSION,
        authorityVersion: COMMERCIAL_AUTHORITY_SOURCE,
        commercialAuthoritySource: COMMERCIAL_AUTHORITY_SOURCE,
        metricsSource: CANONICAL_METRICS_SOURCE,
        assembledBy: COMMERCIAL_OVERVIEW_ASSEMBLER,
      },
      executive: {
        commercialSubscribers: entitledOwners,
        activeSubscriptions: subscriberCounts.activeSubscriptions,
        activeTrials: subscriberCounts.activeTrials,
        mrr,
        arr,
        activeRestaurants: entityCounts.activeRestaurants,
        totalUsers: entityCounts.totalUsers,
      },
      subscriptionHealth: health,
      planDistribution: {
        entries: this.planDistributionFromStates(states),
      },
      needsAttention: {
        expiringWithin30Days,
        windowDays: EXPIRING_SOON_DAYS,
        graceAccounts: null,
        suspendedAccounts: null,
        canceledAccounts: health.canceled,
        expiredAccounts: health.expired,
      },
      recentActivity: {
        available: false,
        items: [],
        reason: "NO_ADMIN_COMMERCIAL_EVENT_READ_API",
      },
      growth: {
        available: false,
        reason: "NO_CANONICAL_GROWTH_METRIC",
      },
    };
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

  private planDistributionFromStates(
    states: OwnerCommercialState[]
  ): PlanDistributionEntry[] {
    const counts = new Map<CommercialPlan, number>();
    for (const state of states) {
      const code = state.planCode;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([planCode, ownerCount]) => ({ planCode, ownerCount }))
      .sort((a, b) => a.planCode.localeCompare(b.planCode));
  }

  private subscriptionHealthFromStates(states: OwnerCommercialState[]) {
    return {
      trial: states.filter((s) => s.subscriptionStatus === "trial").length,
      active: states.filter((s) => s.subscriptionStatus === "active").length,
      canceled: states.filter((s) => s.subscriptionStatus === "canceled").length,
      expired: states.filter((s) => s.subscriptionStatus === "expired").length,
      inactive: states.filter(
        (s) => !s.commercialStatus.isEntitled && s.planCode === "NONE"
      ).length,
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
    const subscriptionIds = [
      ...new Set(
        states
          .filter((state) => state.commercialStatus.countsInMrr && state.subscriptionId != null)
          .map((state) => state.subscriptionId as number)
      ),
    ];
    const rows = await this.loadChargedTerms(subscriptionIds);
    const termsBySubscriptionId = new Map<number, ChargedTermsMrrRow>();
    for (const row of rows) {
      termsBySubscriptionId.set(row.subscriptionId, row);
    }
    return computeMrrFromChargedTerms(states, termsBySubscriptionId);
  }
}

export const canonicalMetricsService = new CanonicalMetricsService();
