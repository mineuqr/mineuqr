import type { CommercialPlan, SubscriptionStatus } from "@commercial/planTypes";
import type { PlanDistributionEntry } from "../metrics/CanonicalMetricsService";
import { CANONICAL_METRICS_SOURCE } from "../metrics/CanonicalMetricsService";
import { COMMERCIAL_OVERVIEW_ASSEMBLER } from "../metrics/CommercialOverviewSnapshot";
import { COMMERCIAL_AUTHORITY_SOURCE } from "../dto/commercialAuthority";

/** ADMIN-UX-1E — stable reporting contract version. */
export const ADMIN_REPORT_VERSION = "ADMIN-UX-1E.1" as const;

export const ADMIN_REPORT_DEFINITIONS_REF =
  "docs/commercial-audit/EXEC-7C-7-COMMERCIAL-METRIC-DEFINITIONS.md" as const;

export type AdminReportId =
  | "commercial-overview"
  | "subscriber-detail"
  | "operational-summary"
  | "commercial-export-package";

export type AdminReportEnvelope = {
  reportId: AdminReportId;
  reportName: string;
  reportVersion: typeof ADMIN_REPORT_VERSION;
  generatedAt: string;
  dataAsOf: string;
  authority: {
    source: typeof COMMERCIAL_AUTHORITY_SOURCE;
    metricsSource: typeof CANONICAL_METRICS_SOURCE;
    assembler: typeof COMMERCIAL_OVERVIEW_ASSEMBLER;
  };
  definitionsRef: typeof ADMIN_REPORT_DEFINITIONS_REF;
  locale?: "en" | "ar";
  generatedByUserId?: number;
};

export type CommercialOverviewReportData = {
  executive: {
    commercialSubscribers: number;
    activeSubscriptions: number;
    activeTrials: number;
    mrr: number;
    arr: number;
    currency: "USD";
    activeRestaurants: number;
    totalUsers: number;
  };
  subscriptionHealth: {
    trial: number;
    active: number;
    canceled: number;
    expired: number;
    inactive: number;
  };
  needsAttention: {
    expiringWithin30Days: number;
    windowDays: 30;
    canceledAccounts: number;
    expiredAccounts: number;
    graceAccounts: null;
    suspendedAccounts: null;
  };
  planDistribution: {
    entries: PlanDistributionEntry[];
  };
  operational: {
    activeRestaurants: number;
    totalUsers: number;
    restaurantDistribution: null | Array<{
      ownerId: number;
      restaurantCount: number;
    }>;
  };
  extensions: {
    recentActivity: {
      available: false;
      reason: "NO_ADMIN_COMMERCIAL_EVENT_READ_API";
    };
    growth: {
      available: false;
      reason: "NO_CANONICAL_GROWTH_METRIC";
    };
    internalStaff: {
      available: false;
      reason: "ADMIN_AUTH_1_NOT_IMPLEMENTED";
    };
  };
};

export type SubscriberDetailRow = {
  ownerId: number;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerRole: "user" | "admin";
  planCode: CommercialPlan;
  planName: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  billingCycle: "monthly" | "yearly" | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  isEntitled: boolean;
  countsInMrr: boolean;
};

export type SubscriberDetailReportData = {
  rows: SubscriberDetailRow[];
  summary: {
    rowCount: number;
    entitledCount: number;
  };
};

export type OperationalSummaryReportData = {
  counts: {
    totalUsers: number;
    totalRestaurants: number;
    activeRestaurants: number;
    totalMenuItems: number;
    totalCategories: number;
    totalOffers: number;
  };
  restaurantDistribution: Array<{
    ownerId: number;
    ownerEmail: string | null;
    restaurantCount: number;
    activeRestaurantCount: number;
  }>;
};

/** Single payload for all export formats — no presentation fields. */
export type CommercialExportPackage = {
  envelope: AdminReportEnvelope;
  overviewReport: CommercialOverviewReportData;
  subscriberReport: SubscriberDetailReportData;
  operationalReport: OperationalSummaryReportData;
  snapshotFingerprint: string;
};

export type CommercialExportFormat = "csv" | "xlsx" | "pdf";

export type CommercialExportFile = {
  filename: string;
  mimeType: string;
  dataBase64: string;
};
