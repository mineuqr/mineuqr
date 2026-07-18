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
  /** Official Revenue = SUM(paid Check grandTotal). */
  revenue: string;
  paidCheckCount: number;
  averageCheck: string;
  taxCollected: string;
  complimentaryCount: number;
  complimentaryAmount: string;
  voidedCount: number;
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
  revenue: string;
  paidCheckCount: number;
  complimentaryCount: number;
  voidedCount: number;
  taxCollected: string;
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
 * CHECK-SETTLEMENT-METHODS-1 — future tender analytics contract.
 * Not mounted on reporting.* yet. Revenue KPI remains Check.grandTotal.
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
