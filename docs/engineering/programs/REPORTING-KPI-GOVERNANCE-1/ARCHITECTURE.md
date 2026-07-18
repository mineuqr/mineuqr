# REPORTING-KPI-GOVERNANCE-1 — Architecture

## Purpose

Formal KPI Governance layer for MineuQR Reporting Platform.

Every business KPI has:

- One stable identifier
- One owner domain
- One canonical formula
- One source service / DTO
- One `calculationVersion`

Presentation never invents formulas.

## Relationship to prior certifications

| Program | Relationship |
|---------|--------------|
| REPORTING-PLATFORM-ARCHITECTURE-1 | Extended — `KPI_DICTIONARY` upgraded to governance registry |
| REPORTING-DASHBOARD-ADOPTION-1 | Preserved — Dashboard still consumes `reporting.*` only |
| CHECK-MANAGEMENT-ARCHITECTURE-1 | Preserved — Revenue remains Check-owned |
| BUSINESS-FINANCIAL-POLICY-2 | Preserved — tax from Check snapshots |
| REPORTING-REVENUE-FORENSICS-1 | Confirmed — Revenue ≠ Order Sales by design |

## Registry location

`shared/reporting-platform/kpiDictionary.ts`

Helpers: `getKpiDefinition`, `listAllKpis`, `listKpiMetadata`, `listKpisByOwner`, `listKpisByContract`

## API surface

| Procedure | Role |
|-----------|------|
| `reporting.getKpiCatalog` | Metadata-only catalog (no values) |
| `reporting.getBusinessMetricsSummary` | Check-domain business KPI values |
| `reporting.getBusinessMetricsTrend` | Revenue trend values |
| `reporting.getOrderSalesSummary` / `getOrderSalesRollup` | Order Read sales KPIs |
| `reporting.getOperationalMetricsSnapshot` | Operational KPIs |
| `reporting.getCatalogStatsSummary` | Catalog / visits |

## Non-canonical surfaces

`ops.getSettlement*` and `server/analytics/settlementMetrics.ts` compute Session `totalAmount` analytics.

They are **not** product Revenue SSOT. Listed in `NON_CANONICAL_REVENUE_SURFACES`.

## Extension rules

1. Add the KPI to `KPI_DICTIONARY` first (all governance fields).
2. Implement value materialization in the owning Reporting service.
3. Expose via the matching Reporting DTO field.
4. Presentation may only format / display the DTO value.
5. If business meaning changes, increment `calculationVersion`.
6. Never silently redefine an existing KPI id.
