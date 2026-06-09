import type { CommercialExportPackage } from "./reportContracts";

/** ANALYTICS-ALIGNMENT-1 — presentation-only projection from CommercialExportPackage. */
export const ANALYTICS_PROJECTION_VERSION = "ANALYTICS-ALIGNMENT-1" as const;

export type UserGrowthSeriesPoint = {
  month: string;
  users: number;
  restaurants: number;
};

export type CommercialAnalyticsProjection = {
  projectionVersion: typeof ANALYTICS_PROJECTION_VERSION;
  snapshotFingerprint: string;
  generatedAt: string;
  dataAsOf: string;
  authority: CommercialExportPackage["envelope"]["authority"];
  commercial: {
    executive: CommercialExportPackage["overviewReport"]["executive"];
    subscriptionHealth: CommercialExportPackage["overviewReport"]["subscriptionHealth"];
    needsAttention: CommercialExportPackage["overviewReport"]["needsAttention"];
    planDistribution: CommercialExportPackage["overviewReport"]["planDistribution"];
  };
  platform: CommercialExportPackage["operationalReport"]["counts"];
  subscribers: Array<{
    owner: {
      id: number;
      name: string | null;
      email: string | null;
      role: "user" | "admin";
    };
    commercial: {
      planCode: string;
      planName: string | null;
      subscriptionStatus: string | null;
      subscriptionId: number | null;
      planId: number | null;
      billingCycle: string | null;
      currentPeriodEnd: string | null;
      commercialStatus: { isEntitled: boolean; invoiceEligible: boolean };
      trialStatus: { isTrial: boolean };
    };
  }>;
  extensions: {
    renewalRate: {
      available: false;
      reason: "NO_CANONICAL_RENEWAL_METRIC";
    };
    revenueByMonth: {
      available: false;
      reason: "NO_CANONICAL_REVENUE_TREND";
    };
    userGrowth:
      | { available: true; series: UserGrowthSeriesPoint[] }
      | { available: false; reason: "NO_PLATFORM_GROWTH_DATA" };
  };
};

/**
 * Maps certified export package to analytics UI shape.
 * No KPI derivation — field selection and table row shaping only.
 */
export function projectCommercialAnalytics(
  pkg: CommercialExportPackage,
  userGrowth: UserGrowthSeriesPoint[] | null | undefined
): CommercialAnalyticsProjection {
  const { envelope, overviewReport, subscriberReport, operationalReport, snapshotFingerprint } =
    pkg;

  return {
    projectionVersion: ANALYTICS_PROJECTION_VERSION,
    snapshotFingerprint,
    generatedAt: envelope.generatedAt,
    dataAsOf: envelope.dataAsOf,
    authority: envelope.authority,
    commercial: {
      executive: overviewReport.executive,
      subscriptionHealth: overviewReport.subscriptionHealth,
      needsAttention: overviewReport.needsAttention,
      planDistribution: overviewReport.planDistribution,
    },
    platform: operationalReport.counts,
    subscribers: subscriberReport.rows.map((row) => ({
      owner: {
        id: row.ownerId,
        name: row.ownerName,
        email: row.ownerEmail,
        role: row.ownerRole,
      },
      commercial: {
        planCode: row.planCode,
        planName: row.planName,
        subscriptionStatus: row.subscriptionStatus,
        subscriptionId: null,
        planId: null,
        billingCycle: row.billingCycle,
        currentPeriodEnd: row.currentPeriodEnd,
        commercialStatus: {
          isEntitled: row.isEntitled,
          invoiceEligible: row.isEntitled,
        },
        trialStatus: {
          isTrial: row.subscriptionStatus === "trial",
        },
      },
    })),
    extensions: {
      renewalRate: {
        available: false,
        reason: "NO_CANONICAL_RENEWAL_METRIC",
      },
      revenueByMonth: {
        available: false,
        reason: "NO_CANONICAL_REVENUE_TREND",
      },
      userGrowth:
        userGrowth && userGrowth.length > 0
          ? { available: true, series: userGrowth }
          : { available: false, reason: "NO_PLATFORM_GROWTH_DATA" },
    },
  };
}
