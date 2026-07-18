# REPORTING-KPI-GOVERNANCE-1 — Implementation Report

## 1. Files modified / added

### Added
- `shared/reporting-platform/__tests__/kpiGovernance.test.ts`
- `shared/reporting-platform/__tests__/reportingKpiGovernance.architecture.guards.test.ts`
- `server/reporting-platform/KpiGovernanceService.ts`
- `client/src/lib/reporting/kpiDisplay.ts`
- `docs/engineering/programs/REPORTING-KPI-GOVERNANCE-1/ARCHITECTURE.md`
- `docs/engineering/programs/REPORTING-KPI-GOVERNANCE-1/KPI-REGISTRY.md`
- `docs/engineering/programs/REPORTING-KPI-GOVERNANCE-1/VALIDATION.md`
- `docs/engineering/programs/REPORTING-KPI-GOVERNANCE-1/IMPLEMENTATION-REPORT.md`

### Modified
- `shared/reporting-platform/kpiDictionary.ts` — full governance registry
- `shared/reporting-platform/index.ts` — exports
- `shared/reporting-platform/reportingContracts.ts` — `KpiCatalogDto`
- `server/reporting-platform/reportingRouter.ts` — `getKpiCatalog`
- `server/reporting-platform/ReportingService.ts` / `index.ts` — façade export
- `server/analytics/settlementMetrics.ts` — non-canonical Revenue notice
- `client/src/components/dashboard/SettlementOverviewSection.tsx` — canonical labels
- `client/src/components/dashboard/OperationalSnapshotSection.tsx` — canonical labels
- `client/src/components/dashboard/SessionsWorkspacePanel.tsx` — canonical labels

### Unchanged (by design)
- `businessMetricsAggregator.ts` formulas
- `OrderSalesMetricsService.ts` formulas
- Check / Order / DB schemas
- Existing Reporting DTO value contracts (fields/semantics)

---

## 2. KPI registry introduced

Authoritative catalog: `KPI_DICTIONARY` in `shared/reporting-platform/kpiDictionary.ts`.

Each KPI now defines: id, name, description, formula, owner, ownerDomain, sourceService, sourceDto, dtoField, unit, valueType, aggregation, availability, calculationVersion, dependsOn, notDefinedAs.

Program id: `REPORTING-KPI-GOVERNANCE-1`  
Baseline version: `calculationVersion = 1`

New registered KPIs (explicit): `paidCheckCount`, `completedOrders`.

Metadata API: `reporting.getKpiCatalog`.

---

## 3. Duplicate calculations removed / quarantined

| Site | Action |
|------|--------|
| Dashboard / Reports | Already DTO-only — labels now bound to registry |
| Excel `scopeTotals` | Kept as presentation rollup of DTO periods (not formula authority) |
| `ops.getSettlement*` / `settlementMetrics` | **Not removed** (external/transitional) — documented as **NON-CANONICAL** for Revenue; dashboard already forbidden from using them |

No silent dual Revenue path remains in Dashboard or Excel presentation.

---

## 4. Ownership mapping

| Domain | KPIs |
|--------|------|
| Check Management | revenue, paidCheckCount, taxCollected, averageCheck, complimentary*, voidedCount, dailySales |
| Order Read | orderSales, completedOrders, averageOrder, orderCount, topSellingItems (planned), activeOrders, kitchenLoad |
| Order Domain | pendingOrders |
| Operational Session | activeSessions, occupiedTables |
| Catalog / Business Settings | catalogCategoryCount, catalogItemCount, menuVisits |

Full table: [`KPI-REGISTRY.md`](./KPI-REGISTRY.md)

---

## 5. Validation results

See [`VALIDATION.md`](./VALIDATION.md). Registry tests + architecture guards + reporting export tests + `pnpm build`.

---

## 6. Risks found

1. **Legacy `ops.getSettlement*` still mounted** — Session-based paidRevenue can confuse operators if called outside Dashboard. Mitigated by documentation + `NON_CANONICAL_REVENUE_SURFACES` + existing Dashboard adoption guards.
2. **Complimentary Rate** remains a UI-derived display ratio (not a registered KPI). Acceptable; documented as presentation-only.
3. **`topSellingItems`** is `planned` — registered for governance completeness without inventing a fake value path.

---

## 7. Recommendations

1. Schedule cutover / removal of `ops.getSettlement*` once no external consumers remain.
2. When adding KPIs, require PR checklist: registry entry + `calculationVersion` policy + DTO field + guard update.
3. Optionally surface `getKpiCatalog` in an internal diagnostics panel.
4. If Complimentary Rate becomes a product KPI, register it with an explicit formula and version.

---

## 8. Production certification status

**REPORTING-KPI-GOVERNANCE-1 — PRODUCTION CERTIFIED**

Blocking issues: **none**.
