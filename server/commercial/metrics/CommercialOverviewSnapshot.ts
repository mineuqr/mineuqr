import type { CommercialPlan } from "@commercial/planTypes";
import {
  CANONICAL_METRICS_SOURCE,
  type PlanDistributionEntry,
} from "./CanonicalMetricsService";
import { COMMERCIAL_AUTHORITY_SOURCE } from "../dto/commercialAuthority";

/** EXEC-7C.1 / EXEC-7C.2 — canonical read contract for /admin/commercial. */
export const COMMERCIAL_OVERVIEW_SCHEMA_VERSION = "EXEC-7C.1" as const;

export const COMMERCIAL_OVERVIEW_ASSEMBLER =
  "CanonicalMetricsService.getCommercialOverviewSnapshot" as const;

export type CommercialOverviewSnapshot = {
  generatedAt: string;
  asOf: string;
  metadata: {
    generatedAt: string;
    asOf: string;
    schemaVersion: typeof COMMERCIAL_OVERVIEW_SCHEMA_VERSION;
    authorityVersion: typeof COMMERCIAL_AUTHORITY_SOURCE;
    commercialAuthoritySource: typeof COMMERCIAL_AUTHORITY_SOURCE;
    metricsSource: typeof CANONICAL_METRICS_SOURCE;
    assembledBy: typeof COMMERCIAL_OVERVIEW_ASSEMBLER;
  };
  executive: {
    commercialSubscribers: number;
    activeSubscriptions: number;
    activeTrials: number;
    mrr: number;
    arr: number;
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
  planDistribution: {
    entries: PlanDistributionEntry[];
  };
  needsAttention: {
    expiringWithin30Days: number;
    windowDays: 30;
    graceAccounts: null;
    suspendedAccounts: null;
    canceledAccounts: number;
    expiredAccounts: number;
  };
  recentActivity: {
    available: false;
    items: [];
    reason: "NO_ADMIN_COMMERCIAL_EVENT_READ_API";
  };
  growth: {
    available: false;
    reason: "NO_CANONICAL_GROWTH_METRIC";
  };
};

export type CommercialOverviewEntityCounts = {
  totalUsers: number;
  activeRestaurants: number;
};
