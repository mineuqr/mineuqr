/**
 * REPORTING-CANONICAL-API-SUNSET-1 — Legacy reporting surface registry.
 *
 * Canonical restaurant business KPIs must come from `reporting.*` only.
 * Entries here are soft-sunset targets (kept for compatibility; not deleted).
 */

export const CANONICAL_REPORTING_SURFACE = "reporting.*" as const;
export const REPORTING_CANONICAL_API_SUNSET_PROGRAM_ID =
  "REPORTING-CANONICAL-API-SUNSET-1" as const;

export type LegacyReportingSurfaceStatus =
  | "soft_sunset_unused"
  | "soft_sunset_alias"
  | "adapter_internal"
  | "out_of_scope_admin_commercial"
  | "operational_not_business_kpi";

export type LegacyReportingSurface = Readonly<{
  name: string;
  file: string;
  owner: string;
  purpose: string;
  canonicalReplacement: string | null;
  /** Evidence-backed consumers at soft-sunset time. */
  consumers: readonly string[];
  status: LegacyReportingSurfaceStatus;
  sunsetRecommendation: string;
  gapProgram?: string;
}>;

/**
 * Complete audited list of non-canonical / legacy reporting-related surfaces.
 * Verified against repository references (see program AUDIT.md).
 */
export const LEGACY_REPORTING_SURFACES = Object.freeze([
  {
    name: "ops.getSettlementSummary",
    file: "server/ops/opsRouter.ts → server/analytics/settlementMetrics.ts",
    owner: "Ops / Settlement Analytics (legacy)",
    purpose:
      "Session-based paidRevenue = SUM(dining_sessions.totalAmount) where settlementOutcome=paid",
    canonicalReplacement: "reporting.getBusinessMetricsSummary",
    consumers: [
      "server/ops/opsRouter.test.ts (unit only)",
      "server/analytics/settlementMetrics.test.ts (unit only)",
    ],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "No production UI consumers. Soft-sunset now; hard-delete in a follow-up after external API freeze.",
  },
  {
    name: "ops.getSettlementTrend",
    file: "server/ops/opsRouter.ts → server/analytics/settlementMetrics.ts",
    owner: "Ops / Settlement Analytics (legacy)",
    purpose: "Session paidRevenue trend buckets",
    canonicalReplacement: "reporting.getBusinessMetricsTrend",
    consumers: [
      "server/ops/opsRouter.test.ts (unit only)",
      "server/analytics/settlementMetrics.test.ts (unit only)",
    ],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "No production UI consumers. Soft-sunset now; hard-delete in a follow-up.",
  },
  {
    name: "ops.getSettlementBreakdown",
    file: "server/ops/opsRouter.ts → server/analytics/settlementMetrics.ts",
    owner: "Ops / Settlement Analytics (legacy)",
    purpose: "Session paid vs complimentary breakdown",
    canonicalReplacement: "reporting.getBusinessMetricsSummary",
    consumers: [
      "server/ops/opsRouter.test.ts (unit only)",
      "server/analytics/settlementMetrics.test.ts (unit only)",
    ],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "No production UI consumers. Soft-sunset now; hard-delete in a follow-up.",
  },
  {
    name: "getSettlementSummary/Trend/Breakdown (service)",
    file: "server/analytics/settlementMetrics.ts",
    owner: "Settlement Analytics",
    purpose: "Underlying Session totalAmount analytics (non-canonical Revenue)",
    canonicalReplacement:
      "reporting.getBusinessMetricsSummary / getBusinessMetricsTrend (Check grandTotal)",
    consumers: ["ops.getSettlement* procedures only"],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "Keep module until ops procedures hard-deleted; never import from Dashboard/Reports.",
  },
  {
    name: "opsSettlementSummaryQueryOptions",
    file: "client/src/lib/queryRuntime.ts",
    owner: "Client query runtime",
    purpose: "Deprecated alias → reportingBusinessSummaryQueryOptions",
    canonicalReplacement: "reportingBusinessSummaryQueryOptions",
    consumers: ["(none outside queryRuntime.ts)"],
    status: "soft_sunset_alias",
    sunsetRecommendation: "Remove alias in a follow-up cleanup PR.",
  },
  {
    name: "opsSettlementTrendQueryOptions",
    file: "client/src/lib/queryRuntime.ts",
    owner: "Client query runtime",
    purpose: "Deprecated alias → reportingBusinessTrendQueryOptions",
    canonicalReplacement: "reportingBusinessTrendQueryOptions",
    consumers: ["(none outside queryRuntime.ts)"],
    status: "soft_sunset_alias",
    sunsetRecommendation: "Remove alias in a follow-up cleanup PR.",
  },
  {
    name: "admin.getRevenueByMonth",
    file: "server/routers.ts → server/db.ts getRevenueByMonth",
    owner: "Admin / EXEC-6 legacy",
    purpose: "Legacy admin monthly revenue chart buckets (not restaurant Check Revenue)",
    canonicalReplacement: null,
    consumers: [
      "server/statistics.test.ts (unit only)",
      "No client useQuery found (Statistics.tsx redirects to commercial analytics)",
    ],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "Soft-sunset. If admin needs restaurant Check Revenue trends, open a program to expose admin-scoped reporting.* reads. Do not treat as restaurant KPI SSOT.",
    gapProgram:
      "ADMIN-REPORTING-PLATFORM-ADOPTION (recommended) — admin restaurant KPI reads via Reporting Platform",
  },
  {
    name: "db.getRevenueByMonth",
    file: "server/db.ts",
    owner: "Admin / EXEC-6 legacy",
    purpose: "S6 legacy revenue buckets for admin.getRevenueByMonth",
    canonicalReplacement: null,
    consumers: ["admin.getRevenueByMonth", "server/statistics.test.ts"],
    status: "soft_sunset_unused",
    sunsetRecommendation: "Soft-sunset with procedure; delete with admin.getRevenueByMonth.",
    gapProgram: "ADMIN-REPORTING-PLATFORM-ADOPTION (recommended)",
  },
  {
    name: "restaurant.stats",
    file: "server/routers.ts → db.getRestaurantStats",
    owner: "Restaurant router",
    purpose: "Catalog category/item counts + viewCount (not sales Revenue)",
    canonicalReplacement: "reporting.getCatalogStatsSummary",
    consumers: [
      "Dashboard.tsx invalidates utils.restaurant.stats only (no useQuery found)",
      "db.getRestaurantStats also used as adapter by CatalogStatsService (canonical path)",
    ],
    status: "soft_sunset_unused",
    sunsetRecommendation:
      "Soft-sunset tRPC procedure for KPI display. Keep getRestaurantStats as internal adapter for CatalogStatsService. Migrate invalidations to reporting.getCatalogStatsSummary when hard-deleting.",
  },
  {
    name: "db.getRestaurantStats",
    file: "server/db.ts",
    owner: "DB helpers",
    purpose: "Raw catalog/visit counters",
    canonicalReplacement:
      "reporting.getCatalogStatsSummary (public); getRestaurantStats remains internal adapter",
    consumers: [
      "server/reporting-platform/CatalogStatsService.ts (canonical adapter)",
      "restaurant.stats procedure",
    ],
    status: "adapter_internal",
    sunsetRecommendation:
      "Do not delete — required adapter for CatalogStatsService. Do not call from UI.",
  },
  {
    name: "ops.getRestaurantOverview",
    file: "server/ops/opsRouter.ts → restaurantOverview.ts",
    owner: "Ops Dashboard",
    purpose: "Live operational overview (sessions/tables/pending) — not business Revenue",
    canonicalReplacement:
      "reporting.getOperationalMetricsSnapshot (business-facing ops KPIs); ops overview remains ops SSOT for boards",
    consumers: [
      "OperationalMetricsService (adapter)",
      "SessionRowQuickActions invalidate",
      "ops tests",
    ],
    status: "operational_not_business_kpi",
    sunsetRecommendation:
      "Not a business-KPI sunset target. Keep for operational boards. Must not be used as Revenue.",
  },
  {
    name: "admin.getCommercialAnalytics / getCommercialOverview",
    file: "server commercial / admin routers",
    owner: "Admin Commercial",
    purpose: "Platform SaaS metrics (MRR/ARR/tenants) — orthogonal to restaurant Check Revenue",
    canonicalReplacement: null,
    consumers: [
      "client/src/pages/admin/StatisticsPanel.tsx",
      "client admin reports domains",
    ],
    status: "out_of_scope_admin_commercial",
    sunsetRecommendation:
      "Out of scope for restaurant Reporting Platform sunset. Keep as admin commercial domain.",
  },
] as const satisfies readonly LegacyReportingSurface[]);

export type LegacyReportingSurfaceName =
  (typeof LEGACY_REPORTING_SURFACES)[number]["name"];

/** Surfaces that must never be consumed by restaurant Dashboard / Reports / Excel / PDF. */
export const FORBIDDEN_RESTAURANT_KPI_CLIENT_APIS = Object.freeze([
  "ops.getSettlementSummary",
  "ops.getSettlementTrend",
  "ops.getSettlementBreakdown",
  "getSettlementSummary",
  "getSettlementTrend",
  "getSettlementBreakdown",
  "admin.getRevenueByMonth",
  "getRevenueByMonth",
  "opsSettlementSummaryQueryOptions",
  "opsSettlementTrendQueryOptions",
  "buildOrderStatistics",
  "computeTodayCompletedSales",
] as const);

export function listSoftSunsetUnusedSurfaces(): readonly LegacyReportingSurface[] {
  return LEGACY_REPORTING_SURFACES.filter((s) => s.status === "soft_sunset_unused");
}

export function listArchitecturalGaps(): readonly LegacyReportingSurface[] {
  return LEGACY_REPORTING_SURFACES.filter((s) => Boolean(s.gapProgram));
}
