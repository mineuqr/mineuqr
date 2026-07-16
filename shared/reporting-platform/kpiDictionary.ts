/**
 * REPORTING-PLATFORM-ARCHITECTURE-1 — Official KPI Ownership Registry.
 *
 * Every KPI consumed by Dashboard / Reports / PDF / Excel / Mobile / AI
 * MUST be registered here with Owner Domain, Source of Truth, and Reporting Contract.
 *
 * Presentation layers MUST NOT invent KPI definitions.
 */

export const REPORTING_PLATFORM_ID = "REPORTING-PLATFORM-ARCHITECTURE-1" as const;

export type KpiClass =
  | "operational"
  | "business"
  | "catalog"
  | "customer";

export type KpiOwnerDomain =
  | "check"
  | "order"
  | "order_read"
  | "operational_session"
  | "catalog"
  | "business_settings"
  | "reporting_platform";

export type ReportingContractId =
  | "BusinessMetricsSummary"
  | "BusinessMetricsTrend"
  | "OperationalMetricsSnapshot"
  | "OrderSalesSummary"
  | "OrderSalesRollup"
  | "CatalogStatsSummary";

export type KpiDefinition = Readonly<{
  id: string;
  name: string;
  kpiClass: KpiClass;
  ownerDomain: KpiOwnerDomain;
  /** Human-readable source-of-truth statement. */
  sourceOfTruth: string;
  reportingContract: ReportingContractId;
  /** Official definition — immutable product glossary. */
  definition: string;
  /** Explicit non-definitions to prevent regressions. */
  notDefinedAs?: readonly string[];
}>;

export const KPI_DICTIONARY = Object.freeze({
  revenue: {
    id: "revenue",
    name: "Revenue",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth: "operational_checks where outcome = paid → SUM(grandTotal)",
    reportingContract: "BusinessMetricsSummary",
    definition: "Sum of Paid Check grand totals in the reporting period.",
    notDefinedAs: [
      "Served order totals",
      "Closed session totals",
      "Order Domain totalAmount",
      "Live Business Settings tax configuration",
    ],
  },
  taxCollected: {
    id: "taxCollected",
    name: "Tax Collected",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth:
      "operational_checks where outcome = paid → SUM(taxAmount) from Check Tax Policy Snapshot path",
    reportingContract: "BusinessMetricsSummary",
    definition:
      "Sum of taxAmount on Paid Checks. Tax is always from immutable Check Tax Policy Snapshot — never live Business Settings.",
    notDefinedAs: ["restaurants.taxEnabled / taxMode / taxPolicyJson at report time"],
  },
  averageCheck: {
    id: "averageCheck",
    name: "Average Check",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth: "Revenue / paidCheckCount",
    reportingContract: "BusinessMetricsSummary",
    definition: "Revenue divided by count of Paid Checks in the period.",
  },
  complimentaryCount: {
    id: "complimentaryCount",
    name: "Complimentary Checks",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth: "operational_checks where outcome = complimentary",
    reportingContract: "BusinessMetricsSummary",
    definition: "Count of complimentary Checks in the period.",
    notDefinedAs: ["Revenue"],
  },
  complimentaryAmount: {
    id: "complimentaryAmount",
    name: "Complimentary Amount",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth:
      "operational_checks where outcome = complimentary → SUM(grandTotal)",
    reportingContract: "BusinessMetricsSummary",
    definition: "Sum of complimentary Check grand totals. Not Revenue.",
  },
  voidedCount: {
    id: "voidedCount",
    name: "Voided Checks",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth: "operational_checks where outcome = voided",
    reportingContract: "BusinessMetricsSummary",
    definition: "Count of voided Checks in the period.",
    notDefinedAs: ["Revenue", "Order cancellations"],
  },
  dailySales: {
    id: "dailySales",
    name: "Daily Sales (Revenue)",
    kpiClass: "business",
    ownerDomain: "check",
    sourceOfTruth: "Paid Check grand totals bucketed by settledAt day",
    reportingContract: "BusinessMetricsTrend",
    definition: "Revenue per calendar day (Paid Checks).",
  },
  orderSales: {
    id: "orderSales",
    name: "Order Sales",
    kpiClass: "business",
    ownerDomain: "order_read",
    sourceOfTruth:
      "order_read_analytics_daily.completedSales (served / completed orders)",
    reportingContract: "OrderSalesSummary",
    definition:
      "Sum of completed (served) Order totals from Order Read Analytics Projection (P-10).",
    notDefinedAs: ["Revenue", "Paid Check grand totals"],
  },
  averageOrder: {
    id: "averageOrder",
    name: "Average Order",
    kpiClass: "business",
    ownerDomain: "order_read",
    sourceOfTruth: "Order Sales / completedOrderCount (P-10)",
    reportingContract: "OrderSalesSummary",
    definition: "Completed order sales divided by completed order count.",
  },
  orderCount: {
    id: "orderCount",
    name: "Order Count",
    kpiClass: "business",
    ownerDomain: "order_read",
    sourceOfTruth: "order_read_analytics_daily.orderCount",
    reportingContract: "OrderSalesSummary",
    definition: "Count of orders recorded in Order Read Analytics Projection.",
  },
  topSellingItems: {
    id: "topSellingItems",
    name: "Top Selling Items",
    kpiClass: "catalog",
    ownerDomain: "order_read",
    sourceOfTruth: "Order Read line-item projections (future rollup)",
    reportingContract: "OrderSalesRollup",
    definition:
      "Ranked catalog items by sold quantity/amount from Order Read line projections.",
  },
  activeSessions: {
    id: "activeSessions",
    name: "Active Sessions",
    kpiClass: "operational",
    ownerDomain: "operational_session",
    sourceOfTruth: "Open dining sessions for restaurant",
    reportingContract: "OperationalMetricsSnapshot",
    definition: "Count of currently active Operational Sessions.",
  },
  occupiedTables: {
    id: "occupiedTables",
    name: "Occupied Tables",
    kpiClass: "operational",
    ownerDomain: "operational_session",
    sourceOfTruth: "Distinct tableId among active sessions",
    reportingContract: "OperationalMetricsSnapshot",
    definition: "Count of tables with an active session.",
  },
  activeOrders: {
    id: "activeOrders",
    name: "Active Orders",
    kpiClass: "operational",
    ownerDomain: "order_read",
    sourceOfTruth: "Order Read P-06 / active order counters",
    reportingContract: "OperationalMetricsSnapshot",
    definition: "Orders in active fulfilment statuses.",
  },
  pendingOrders: {
    id: "pendingOrders",
    name: "Pending Orders",
    kpiClass: "operational",
    ownerDomain: "order",
    sourceOfTruth: "Order Domain active status count (via ops overview / P-06)",
    reportingContract: "OperationalMetricsSnapshot",
    definition: "Orders awaiting or in kitchen fulfilment pipeline.",
  },
  kitchenLoad: {
    id: "kitchenLoad",
    name: "Kitchen Load",
    kpiClass: "operational",
    ownerDomain: "order_read",
    sourceOfTruth: "P-06 pending + preparing + ready",
    reportingContract: "OperationalMetricsSnapshot",
    definition: "Aggregate kitchen queue depth from Order Read operational KPIs.",
  },
  catalogCategoryCount: {
    id: "catalogCategoryCount",
    name: "Categories",
    kpiClass: "catalog",
    ownerDomain: "catalog",
    sourceOfTruth: "categories COUNT",
    reportingContract: "CatalogStatsSummary",
    definition: "Number of menu categories.",
  },
  catalogItemCount: {
    id: "catalogItemCount",
    name: "Items",
    kpiClass: "catalog",
    ownerDomain: "catalog",
    sourceOfTruth: "menu_items COUNT",
    reportingContract: "CatalogStatsSummary",
    definition: "Number of menu items.",
  },
  menuVisits: {
    id: "menuVisits",
    name: "Menu Visits",
    kpiClass: "customer",
    ownerDomain: "business_settings",
    sourceOfTruth: "restaurants.viewCount",
    reportingContract: "CatalogStatsSummary",
    definition: "Lifetime menu view counter (not sales).",
  },
} as const satisfies Record<string, KpiDefinition>);

export type KpiId = keyof typeof KPI_DICTIONARY;

export function getKpiDefinition(id: KpiId): KpiDefinition {
  return KPI_DICTIONARY[id];
}

export function listKpisByClass(kpiClass: KpiClass): readonly KpiDefinition[] {
  return Object.values(KPI_DICTIONARY).filter((k) => k.kpiClass === kpiClass);
}
