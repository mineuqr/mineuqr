/**
 * REPORTING-KPI-GOVERNANCE-1 — Canonical KPI Governance Registry.
 * Extends REPORTING-PLATFORM-ARCHITECTURE-1 ownership rules.
 *
 * Authoritative catalog for every business / operational / catalog KPI.
 * Presentation layers MUST NOT invent formulas or alternate ownership.
 *
 * calculationVersion: increment when the business meaning of a KPI changes.
 */

export const REPORTING_PLATFORM_ID = "REPORTING-PLATFORM-ARCHITECTURE-1" as const;
export const KPI_GOVERNANCE_PROGRAM_ID = "REPORTING-KPI-GOVERNANCE-1" as const;

/** Initial governance baseline — bump per-KPI when meaning changes. */
export const KPI_CALCULATION_VERSION_BASELINE = 1 as const;

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
  | "CatalogStatsSummary"
  | "KpiCatalog";

export type KpiUnit = "money" | "count" | "ratio";

export type KpiValueType = "decimal_string" | "integer";

export type KpiAggregation =
  | "sum"
  | "count"
  | "average"
  | "snapshot"
  | "derived";

export type KpiAvailability = "ga" | "planned";

/** Human-readable owner label for governance docs and diagnostics. */
export type KpiOwnerLabel =
  | "Check Management"
  | "Order Domain"
  | "Order Read"
  | "Operational Session"
  | "Catalog"
  | "Business Settings"
  | "Reporting Platform";

export type KpiDefinition = Readonly<{
  /** Stable KPI identifier (machine key). */
  id: string;
  /** Display name (English canonical). */
  name: string;
  /** Business description for glossary / diagnostics. */
  description: string;
  /** Official definition — immutable product glossary. */
  definition: string;
  /** Canonical formula (human + machine readable). */
  formula: string;
  kpiClass: KpiClass;
  /** Alias of kpiClass for metadata consumers. */
  category: KpiClass;
  ownerDomain: KpiOwnerDomain;
  /** Explicit ownership label. */
  owner: KpiOwnerLabel;
  /** Reporting service entry that materializes this KPI. */
  sourceService: string;
  /** Reporting DTO contract that carries the value. */
  sourceDto: ReportingContractId;
  /** Field name on the source DTO. */
  dtoField: string;
  /** @deprecated Prefer sourceDto — kept for REPORTING-PLATFORM-ARCHITECTURE-1 compat. */
  reportingContract: ReportingContractId;
  /** Human-readable source-of-truth statement. */
  sourceOfTruth: string;
  unit: KpiUnit;
  valueType: KpiValueType;
  aggregation: KpiAggregation;
  availability: KpiAvailability;
  /**
   * Increment when the business meaning of this KPI changes.
   * Silent semantic changes are forbidden.
   */
  calculationVersion: number;
  /** Dependent KPI ids (derived metrics). */
  dependsOn?: readonly string[];
  /** Explicit non-definitions to prevent regressions. */
  notDefinedAs?: readonly string[];
}>;

function def(
  partial: Omit<KpiDefinition, "category" | "reportingContract" | "description"> & {
    description?: string;
  }
): KpiDefinition {
  return {
    ...partial,
    description: partial.description ?? partial.definition,
    category: partial.kpiClass,
    reportingContract: partial.sourceDto,
  };
}

export const KPI_DICTIONARY = Object.freeze({
  revenue: def({
    id: "revenue",
    /** REPORTING-UX-RATIONALIZATION-1 Rev 2.0 — preferred user label (id unchanged). */
    name: "Gross Sales",
    definition:
      "Gross Sales: sum of Paid Check grand totals (gen=1 Settlement Record publications) in the reporting period. Refund publications do not mutate this KPI.",
    formula:
      "SUM(settlement_records.grandTotal WHERE outcome = 'paid' AND recordGeneration = 1 AND recordKind IN ('settlement','void')) /* Gross — excludes recordKind=refund */",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "revenue",
    sourceOfTruth:
      "settlement_records where outcome = paid AND recordGeneration = 1 → SUM(grandTotal) (Check freeze publication)",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: [
      "Served order totals",
      "Closed session totals",
      "Order Domain totalAmount",
      "Live Business Settings tax configuration",
      "ops.getSettlement* / Session totalAmount",
      "Order Sales",
      "Paid Revenue",
      "Settlement Revenue",
      "Net Sales",
      "Refund Amount",
      "Check Revenue",
    ],
  }),
  refundPublishedTotal: def({
    id: "refundPublishedTotal",
    name: "Refund Amount",
    definition:
      "Sum of compensating Settlement Record grand totals with recordKind=refund in the reporting period (publication time).",
    formula:
      "SUM(settlement_records.grandTotal WHERE recordKind = 'refund') /* compensating publication — not Gross Sales */",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "refundPublishedTotal",
    sourceOfTruth:
      "settlement_records where recordKind = refund → SUM(grandTotal) (compensating Check reverse publication)",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Gross Sales", "Net Sales", "Register Expected Cash"],
  }),
  refundPublicationCount: def({
    id: "refundPublicationCount",
    name: "Refund Count",
    definition:
      "Count of compensating Settlement Record publications with recordKind=refund in the reporting period.",
    formula: "COUNT(settlement_records WHERE recordKind = 'refund')",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "refundPublicationCount",
    sourceOfTruth:
      "settlement_records where recordKind = refund → COUNT(*)",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Paid Checks", "Voided Checks"],
  }),
  netRevenue: def({
    id: "netRevenue",
    name: "Net Sales",
    definition:
      "Gross Sales minus Refund Amount. Reporting derivation from immutable Settlement Record publications only — Reporting never owns financial truth.",
    formula:
      "BusinessMetricsSummary.revenue − BusinessMetricsSummary.refundPublishedTotal",
    kpiClass: "business",
    ownerDomain: "reporting_platform",
    owner: "Reporting Platform",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "netRevenue",
    sourceOfTruth:
      "Derived: Gross Sales (gen=1 paid) − refund Settlement Record publications",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "derived",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["revenue", "refundPublishedTotal"],
    notDefinedAs: [
      "Gross Sales",
      "Order Sales",
      "Register Expected Cash",
      "Second monetary authority",
    ],
  }),
  refundRate: def({
    id: "refundRate",
    name: "Refund Rate",
    definition:
      "Refund Amount as a percent of Gross Sales in the period (0 when Gross = 0).",
    formula:
      "(refundPublishedTotal / revenue) × 100 when revenue > 0 else 0",
    kpiClass: "business",
    ownerDomain: "reporting_platform",
    owner: "Reporting Platform",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "refundRate",
    sourceOfTruth: "Derived from Gross Sales and Refund Amount",
    unit: "ratio",
    valueType: "decimal_string",
    aggregation: "derived",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["revenue", "refundPublishedTotal"],
    notDefinedAs: ["Complimentary rate", "Void rate"],
  }),
  paidCheckCount: def({
    id: "paidCheckCount",
    name: "Paid Checks",
    definition: "Count of Paid Checks in the reporting period.",
    formula:
      "COUNT(settlement_records WHERE outcome = 'paid' AND recordGeneration = 1)",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "paidCheckCount",
    sourceOfTruth:
      "settlement_records where outcome = paid → COUNT(*) (Check freeze publication)",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Order count", "Session count"],
  }),
  taxCollected: def({
    id: "taxCollected",
    name: "Tax Collected",
    definition:
      "Sum of taxAmount on Paid Checks. Tax is always from immutable Check Tax Policy Snapshot — never live Business Settings.",
    formula:
      "SUM(settlement_records.taxAmount WHERE outcome = 'paid' AND recordGeneration = 1) /* Settlement Record tax snapshot */",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "taxCollected",
    sourceOfTruth:
      "settlement_records where outcome = paid → SUM(taxAmount) from published tax snapshot",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["restaurants.taxEnabled / taxMode / taxPolicyJson at report time"],
  }),
  averageCheck: def({
    id: "averageCheck",
    name: "Average Check",
    definition: "Gross Sales divided by count of Paid Checks in the period.",
    formula: "Gross Sales / paidCheckCount",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "averageCheck",
    sourceOfTruth: "Gross Sales / paidCheckCount",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "derived",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["revenue", "paidCheckCount"],
    notDefinedAs: ["Average Order"],
  }),
  complimentaryCount: def({
    id: "complimentaryCount",
    name: "Complimentary Checks",
    definition: "Count of complimentary Checks in the period.",
    formula:
      "COUNT(settlement_records WHERE outcome = 'complimentary' AND recordGeneration = 1)",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "complimentaryCount",
    sourceOfTruth:
      "settlement_records where outcome = complimentary (Check freeze publication)",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Revenue"],
  }),
  complimentaryAmount: def({
    id: "complimentaryAmount",
    name: "Complimentary Amount",
    definition: "Sum of complimentary Check grand totals. Not Revenue.",
    formula:
      "SUM(settlement_records.grandTotal WHERE outcome = 'complimentary' AND recordGeneration = 1)",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "complimentaryAmount",
    sourceOfTruth:
      "settlement_records where outcome = complimentary → SUM(grandTotal)",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Revenue"],
  }),
  voidedCount: def({
    id: "voidedCount",
    name: "Voided Checks",
    definition: "Count of voided Checks in the period.",
    formula:
      "COUNT(settlement_records WHERE outcome = 'voided' AND recordGeneration = 1)",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsSummary",
    sourceDto: "BusinessMetricsSummary",
    dtoField: "voidedCount",
    sourceOfTruth:
      "settlement_records where outcome = voided (Check freeze publication)",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Revenue", "Order cancellations"],
  }),
  dailySales: def({
    id: "dailySales",
    name: "Daily Gross Sales",
    definition: "Gross Sales per business calendar day (Paid Checks).",
    formula:
      "SUM(settlement_records.grandTotal WHERE outcome = 'paid' AND recordGeneration = 1) GROUP BY day(settledAt)",
    kpiClass: "business",
    ownerDomain: "check",
    owner: "Check Management",
    sourceService: "getBusinessMetricsTrend",
    sourceDto: "BusinessMetricsTrend",
    dtoField: "points[].revenue",
    sourceOfTruth:
      "Paid Settlement Record grand totals bucketed by settledAt business day",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["revenue"],
  }),
  orderSales: def({
    id: "orderSales",
    name: "Order Sales",
    definition:
      "Sum of completed (served) Order totals from Order Read Analytics Projection (P-10).",
    formula: "SUM(order_read_analytics_daily.completedSales)",
    kpiClass: "business",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOrderSalesSummary / getOrderSalesRollup",
    sourceDto: "OrderSalesSummary",
    dtoField: "today.orderSales | month.orderSales | periods[].orderSales",
    sourceOfTruth:
      "order_read_analytics_daily.completedSales (served / completed orders)",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "sum",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: [
      "Revenue",
      "Check Revenue",
      "Paid Check grand totals",
      "ops.getSettlement* / Session totalAmount",
      "Gross Sales",
      "Paid Revenue",
      "Settlement Revenue",
    ],
  }),
  completedOrders: def({
    id: "completedOrders",
    name: "Completed Orders",
    definition:
      "Count of completed (served) orders from Order Read Analytics Projection (P-10).",
    formula: "SUM(order_read_analytics_daily.completedOrderCount)",
    kpiClass: "business",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOrderSalesSummary / getOrderSalesRollup",
    sourceDto: "OrderSalesSummary",
    dtoField: "today.completedOrders | month.completedOrders | periods[].completedOrders",
    sourceOfTruth: "order_read_analytics_daily.completedOrderCount",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Paid Checks"],
  }),
  averageOrder: def({
    id: "averageOrder",
    name: "Average Order",
    definition: "Completed order sales divided by completed order count.",
    formula: "Order Sales / completedOrderCount",
    kpiClass: "business",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOrderSalesSummary / getOrderSalesRollup",
    sourceDto: "OrderSalesSummary",
    dtoField: "today.averageOrder | month.averageOrder",
    sourceOfTruth: "Order Sales / completedOrderCount (P-10)",
    unit: "money",
    valueType: "decimal_string",
    aggregation: "derived",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["orderSales", "completedOrders"],
    notDefinedAs: ["Average Check"],
  }),
  orderCount: def({
    id: "orderCount",
    name: "Orders",
    definition: "Count of orders recorded in Order Read Analytics Projection.",
    formula: "SUM(order_read_analytics_daily.orderCount)",
    kpiClass: "business",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOrderSalesSummary / getOrderSalesRollup",
    sourceDto: "OrderSalesSummary",
    dtoField: "today.totalOrders | month.totalOrders | periods[].orderCount",
    sourceOfTruth: "order_read_analytics_daily.orderCount",
    unit: "count",
    valueType: "integer",
    aggregation: "count",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  topSellingItems: def({
    id: "topSellingItems",
    name: "Top Selling Items",
    definition:
      "Ranked catalog items by sold quantity/amount from Order Read line projections.",
    formula: "RANK(Order Read line-item projections) /* planned */",
    kpiClass: "catalog",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOrderSalesRollup",
    sourceDto: "OrderSalesRollup",
    dtoField: "(future)",
    sourceOfTruth: "Order Read line-item projections (future rollup)",
    unit: "count",
    valueType: "integer",
    aggregation: "sum",
    availability: "planned",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  activeSessions: def({
    id: "activeSessions",
    name: "Active Sessions",
    definition: "Count of currently active Operational Sessions.",
    formula: "COUNT(open dining sessions)",
    kpiClass: "operational",
    ownerDomain: "operational_session",
    owner: "Operational Session",
    sourceService: "getOperationalMetricsSnapshot",
    sourceDto: "OperationalMetricsSnapshot",
    dtoField: "activeSessions",
    sourceOfTruth: "Open dining sessions for restaurant",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  occupiedTables: def({
    id: "occupiedTables",
    name: "Occupied Tables",
    definition: "Count of tables with an active session.",
    formula: "COUNT(DISTINCT tableId among active sessions)",
    kpiClass: "operational",
    ownerDomain: "operational_session",
    owner: "Operational Session",
    sourceService: "getOperationalMetricsSnapshot",
    sourceDto: "OperationalMetricsSnapshot",
    dtoField: "occupiedTables",
    sourceOfTruth: "Distinct tableId among active sessions",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  activeOrders: def({
    id: "activeOrders",
    name: "Active Orders",
    definition: "Orders in active fulfilment statuses.",
    formula: "Order Read P-06 activeOrders",
    kpiClass: "operational",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOperationalMetricsSnapshot",
    sourceDto: "OperationalMetricsSnapshot",
    dtoField: "activeOrders",
    sourceOfTruth: "Order Read P-06 / active order counters",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  pendingOrders: def({
    id: "pendingOrders",
    name: "Pending Orders",
    definition: "Orders awaiting or in kitchen fulfilment pipeline.",
    formula: "Order Domain / P-06 pendingOrders",
    kpiClass: "operational",
    ownerDomain: "order",
    owner: "Order Domain",
    sourceService: "getOperationalMetricsSnapshot",
    sourceDto: "OperationalMetricsSnapshot",
    dtoField: "pendingOrders",
    sourceOfTruth: "Order Domain active status count (via ops overview / P-06)",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  kitchenLoad: def({
    id: "kitchenLoad",
    name: "Kitchen Load",
    definition: "Aggregate kitchen queue depth from Order Read operational KPIs.",
    formula: "P-06 pending + preparing + ready",
    kpiClass: "operational",
    ownerDomain: "order_read",
    owner: "Order Read",
    sourceService: "getOperationalMetricsSnapshot",
    sourceDto: "OperationalMetricsSnapshot",
    dtoField: "kitchenLoad",
    sourceOfTruth: "P-06 pending + preparing + ready",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    dependsOn: ["pendingOrders", "activeOrders"],
  }),
  catalogCategoryCount: def({
    id: "catalogCategoryCount",
    name: "Categories",
    definition: "Number of menu categories.",
    formula: "COUNT(categories)",
    kpiClass: "catalog",
    ownerDomain: "catalog",
    owner: "Catalog",
    sourceService: "getCatalogStatsSummary",
    sourceDto: "CatalogStatsSummary",
    dtoField: "categoryCount",
    sourceOfTruth: "categories COUNT",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  catalogItemCount: def({
    id: "catalogItemCount",
    name: "Menu Items",
    definition: "Number of menu items.",
    formula: "COUNT(menu_items)",
    kpiClass: "catalog",
    ownerDomain: "catalog",
    owner: "Catalog",
    sourceService: "getCatalogStatsSummary",
    sourceDto: "CatalogStatsSummary",
    dtoField: "itemCount",
    sourceOfTruth: "menu_items COUNT",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
  }),
  menuVisits: def({
    id: "menuVisits",
    name: "Menu Visits",
    definition: "Lifetime menu view counter (not sales).",
    formula: "restaurants.viewCount",
    kpiClass: "customer",
    ownerDomain: "business_settings",
    owner: "Business Settings",
    sourceService: "getCatalogStatsSummary",
    sourceDto: "CatalogStatsSummary",
    dtoField: "menuVisits",
    sourceOfTruth: "restaurants.viewCount",
    unit: "count",
    valueType: "integer",
    aggregation: "snapshot",
    availability: "ga",
    calculationVersion: KPI_CALCULATION_VERSION_BASELINE,
    notDefinedAs: ["Revenue", "Order Sales"],
  }),
} as const satisfies Record<string, KpiDefinition>);

export type KpiId = keyof typeof KPI_DICTIONARY;

export type KpiMetadata = Readonly<{
  id: KpiId;
  name: string;
  description: string;
  owner: KpiOwnerLabel;
  ownerDomain: KpiOwnerDomain;
  calculationVersion: number;
  source: string;
  sourceService: string;
  sourceDto: ReportingContractId;
  dtoField: string;
  unit: KpiUnit;
  category: KpiClass;
  formula: string;
  aggregation: KpiAggregation;
  availability: KpiAvailability;
  dependsOn: readonly string[];
}>;

export function getKpiDefinition(id: KpiId): KpiDefinition {
  return KPI_DICTIONARY[id];
}

export function listKpisByClass(kpiClass: KpiClass): readonly KpiDefinition[] {
  return Object.values(KPI_DICTIONARY).filter((k) => k.kpiClass === kpiClass);
}

export function listAllKpis(): readonly KpiDefinition[] {
  return Object.values(KPI_DICTIONARY);
}

export function listKpisByOwner(
  ownerDomain: KpiOwnerDomain
): readonly KpiDefinition[] {
  return Object.values(KPI_DICTIONARY).filter((k) => k.ownerDomain === ownerDomain);
}

export function listKpisByContract(
  contract: ReportingContractId
): readonly KpiDefinition[] {
  return Object.values(KPI_DICTIONARY).filter((k) => k.sourceDto === contract);
}

export function toKpiMetadata(def: KpiDefinition): KpiMetadata {
  return {
    id: def.id as KpiId,
    name: def.name,
    description: def.description,
    owner: def.owner,
    ownerDomain: def.ownerDomain,
    calculationVersion: def.calculationVersion,
    source: def.sourceOfTruth,
    sourceService: def.sourceService,
    sourceDto: def.sourceDto,
    dtoField: def.dtoField,
    unit: def.unit,
    category: def.category,
    formula: def.formula,
    aggregation: def.aggregation,
    availability: def.availability,
    dependsOn: def.dependsOn ?? [],
  };
}

export function listKpiMetadata(): readonly KpiMetadata[] {
  return listAllKpis().map(toKpiMetadata);
}

/**
 * Non-canonical revenue surfaces — permanently forbidden (deleted by COMPATIBILITY-CLEANUP-1).
 * Names retained so guards prevent revival as Revenue SSOT.
 */
export const NON_CANONICAL_REVENUE_SURFACES = Object.freeze([
  "ops.getSettlementSummary",
  "ops.getSettlementTrend",
  "ops.getSettlementBreakdown",
  "server/analytics/settlementMetrics.ts (Session totalAmount)",
] as const);
