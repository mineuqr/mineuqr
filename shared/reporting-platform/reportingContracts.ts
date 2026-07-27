/**
 * REPORTING-PLATFORM-ARCHITECTURE-1 — Reporting DTOs / contracts.
 *
 * Dashboard, Reports, PDF, Excel, Mobile, and AI MUST consume these DTOs.
 * Presentation MUST NOT calculate KPI values.
 */

import type { CurrencySnapshot, TaxPolicySnapshot } from "../operational-session";

export const REPORTING_CONTRACT_VERSION = 1 as const;

export type ReportingPeriodInput = Readonly<{
  restaurantId: number;
  /** Inclusive lower bound (ISO / MySQL datetime). */
  from?: string;
  /** Inclusive upper bound (ISO / MySQL datetime). */
  to?: string;
}>;

/**
 * Check trend API grouping — subset of TimeSeriesGranularity.
 * Full set: hour | day | week | month | quarter | year
 * (see REPORTING-TIME-SERIES-ARCHITECTURE-1).
 */
export type ReportingTrendGrouping = "day" | "week" | "month";

/** Currency context taken from Check snapshots in the period (not live settings). */
export type ReportingCurrencyContext = Readonly<{
  /** Dominant / first observed currency snapshot among paid checks; null if none. */
  currencySnapshot: CurrencySnapshot | null;
}>;

export type BusinessMetricsSummaryDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "BusinessMetricsSummary";
  generatedAt: string;
  restaurantId: number;
  from: string | null;
  to: string | null;
  /**
   * Total Sales (KPI id: revenue) = SUM(paid gen=1 Settlement Record grandTotal).
   * Refund publications MUST NOT mutate this field (ADR-ARCH-032).
   */
  revenue: string;
  paidCheckCount: number;
  averageCheck: string;
  taxCollected: string;
  complimentaryCount: number;
  complimentaryAmount: string;
  voidedCount: number;
  /**
   * Refund Amount (KPI id: refundPublishedTotal) —
   * SUM(refund Settlement Record grandTotal) in period.
   * Compensating publication total; not a second Revenue authority.
   */
  refundPublishedTotal: string;
  /** Refund Count — count of refund Settlement Record publications in period. */
  refundPublicationCount: number;
  /**
   * Net Sales (KPI id: netRevenue) = Total Sales − Refund Amount (publication-derived).
   * Reporting derivation only — never financial truth ownership.
   */
  netRevenue: string;
  /**
   * Refund Rate = Refund Amount / Total Sales × 100 (0 when Total Sales = 0).
   * Percent string with two decimals.
   */
  refundRate: string;
  currency: ReportingCurrencyContext;
  /**
   * Sample Tax Policy Snapshot from a paid Check in-range (immutable).
   * Never live Business Settings.
   */
  sampleTaxPolicySnapshot: TaxPolicySnapshot | null;
}>;

export type BusinessMetricsTrendPointDto = Readonly<{
  periodKey: string;
  periodStart: string;
  /** Total Sales (KPI id: revenue) for the period. */
  revenue: string;
  paidCheckCount: number;
  complimentaryCount: number;
  voidedCount: number;
  taxCollected: string;
  /** REFUND-REPORTING-ADOPTION-1 — refund publications in the period. */
  refundPublishedTotal: string;
  /** Gross revenue − refund publications for the period. */
  netRevenue: string;
}>;

export type BusinessMetricsTrendDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "BusinessMetricsTrend";
  generatedAt: string;
  restaurantId: number;
  grouping: ReportingTrendGrouping;
  from: string | null;
  to: string | null;
  points: readonly BusinessMetricsTrendPointDto[];
}>;

export type OperationalMetricsSnapshotDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "OperationalMetricsSnapshot";
  generatedAt: string;
  restaurantId: number;
  activeSessions: number;
  occupiedTables: number;
  pendingOrders: number;
  /** Kitchen load = pending + preparing + ready when P-06 available; else pendingOrders. */
  kitchenLoad: number;
  activeOrders: number | null;
  preparingOrders: number | null;
  readyOrders: number | null;
}>;

export type OrderSalesPeriodDto = Readonly<{
  totalOrders: number;
  completedOrders: number;
  /** Completed order sales — NOT Revenue. */
  orderSales: string;
  averageOrder: string;
}>;

export type OrderSalesSummaryDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "OrderSalesSummary";
  generatedAt: string;
  restaurantId: number;
  today: OrderSalesPeriodDto;
  month: OrderSalesPeriodDto;
}>;

export type OrderSalesRollupPeriodDto = Readonly<{
  periodKey: string;
  orderCount: number;
  completedOrders: number;
  orderSales: string;
}>;

export type OrderSalesRollupDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "OrderSalesRollup";
  generatedAt: string;
  restaurantId: number;
  granularity: "day" | "month";
  periods: readonly OrderSalesRollupPeriodDto[];
}>;

export type CatalogStatsSummaryDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "CatalogStatsSummary";
  generatedAt: string;
  restaurantId: number;
  categoryCount: number;
  itemCount: number;
  menuVisits: number;
}>;

/**
 * REPORTING-KPI-GOVERNANCE-1 — metadata-only catalog (no KPI values).
 * Diagnostics / future reporting tooling. Does not calculate business metrics.
 */
export type KpiCatalogEntryDto = Readonly<{
  id: string;
  name: string;
  description: string;
  owner: string;
  ownerDomain: string;
  calculationVersion: number;
  source: string;
  sourceService: string;
  sourceDto: string;
  dtoField: string;
  unit: string;
  category: string;
  formula: string;
  aggregation: string;
  availability: string;
  dependsOn: readonly string[];
}>;

export type KpiCatalogDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "KpiCatalog";
  programId: "REPORTING-KPI-GOVERNANCE-1";
  generatedAt: string;
  kpis: readonly KpiCatalogEntryDto[];
}>;

/**
 * CHECK-SETTLEMENT-METHODS-1 — tender distribution (legacy shape).
 * Prefer PaymentMethodAnalyticsDto for full analytics.
 * Revenue KPI remains Check.grandTotal.
 */
export type SettlementDistributionBucketDto = Readonly<{
  paymentMethod: string;
  category: string;
  transactionCount: number;
  amount: string;
}>;

export type SettlementDistributionDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "SettlementDistribution";
  programId: "CHECK-SETTLEMENT-METHODS-1";
  generatedAt: string;
  restaurantId: number;
  from: string | null;
  to: string | null;
  /**
   * Tender breakdown from settlement transactions.
   * Must not replace BusinessMetricsSummary.revenue.
   */
  buckets: readonly SettlementDistributionBucketDto[];
}>;

/**
 * REPORTING-PAYMENT-METHOD-ANALYTICS-1 — payment-method analytics from
 * Settlement Record payment snapshots (canonical financial reporting source).
 * Settlement Transactions remain implementation/payment-detail data where applicable.
 * Not a substitute for Total Sales (KPI id: revenue).
 */
export type PaymentMethodAnalyticsBucketDto = Readonly<{
  paymentMethod: string;
  category: string;
  /** Sum of captured tender amounts for this method. */
  tenderAmount: string;
  transactionCount: number;
  /** Distinct Checks with a captured tender of this method. */
  checkCount: number;
  /** tenderAmount / checkCount (0 when checkCount = 0). */
  averageCheck: string;
  /** Share of monetaryTenderTotal (0–100, two decimals). */
  mixPercent: string;
}>;

export type PaymentMethodAnalyticsDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "PaymentMethodAnalytics";
  programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1";
  generatedAt: string;
  restaurantId: number;
  from: string | null;
  to: string | null;
  /**
   * Sum of captured monetary settlement tenders in range.
   * Must not replace BusinessMetricsSummary.revenue.
   */
  monetaryTenderTotal: string;
  complimentaryAmount: string;
  buckets: readonly PaymentMethodAnalyticsBucketDto[];
  /**
   * REFUND-REPORTING-ADOPTION-1 — sum of refunded tender snapshot amounts.
   * Compensating publication analytics; does not mutate monetaryTenderTotal.
   */
  refundTenderTotal: string;
  /** Refund tender breakdown by payment method (status=refunded). */
  refundBuckets: readonly PaymentMethodAnalyticsBucketDto[];
}>;

/**
 * REPORTING-SALES-CHANNEL-ANALYTICS-1 — Order Sales by ordering channel.
 * Operational plane (Order Read). Does NOT replace Total Sales (Check Revenue)
 * or Payment Method Analytics.
 */
export type SalesChannelAnalyticsBucketDto = Readonly<{
  channelId: string;
  channelName: string;
  orderCount: number;
  /** Completed / served order sales for the channel (Order Sales plane). */
  salesAmount: string;
  /** Share of sum(channel salesAmount) — 0–100, two decimals. */
  salesMixPercent: string;
  /** Share of sum(channel orderCount) — 0–100, two decimals. */
  orderMixPercent: string;
}>;

export type SalesChannelAnalyticsDto = Readonly<{
  contractVersion: typeof REPORTING_CONTRACT_VERSION;
  contractId: "SalesChannelAnalytics";
  programId: "REPORTING-SALES-CHANNEL-ANALYTICS-1";
  generatedAt: string;
  restaurantId: number;
  from: string | null;
  to: string | null;
  /** Sum of bucket salesAmount (Order Sales by channel — not Check Revenue). */
  totalSalesAmount: string;
  /** Sum of bucket orderCount. */
  totalOrderCount: number;
  buckets: readonly SalesChannelAnalyticsBucketDto[];
}>;
