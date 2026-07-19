# REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1 — Implementation Report

**Status:** Complete  
**Date:** 2026-07-19  
**Priority:** P1 — Reporting Consistency  
**Type:** Presentation Architecture / Product Semantics Alignment

---

## Final implementation status

**COMPLETE.** Dashboard Order Sales cards and Executive Summary now bind **Completed Orders** beside **Order Sales**, sharing the served population. Formulas, materializers, Business Day, and Reporting APIs are unchanged.

---

## 1. KPI semantic inventory

| Surface | Card (before) | Bound field (before) | Population (before) |
|---------|---------------|----------------------|---------------------|
| Reports | Today's Orders | `today.totalOrders` | All placed |
| Reports | Month Orders | `month.totalOrders` | All placed |
| Reports | Today's / Month Order Sales | `*.orderSales` | Completed / served |
| Reports | Month/Year rollup rows | `row.orderCount` · sales | Mixed |
| Excel Executive | Orders | `orderCount` | All placed |
| Excel Executive | Order Sales / Average Order | sales / avg | Completed |
| Home | Today's Order Sales only | `today.orderSales` | Completed (no count pair) |
| Home | Pending Orders | live statuses | Operational queue (distinct) |

---

## 2. Business population definitions

| Population | Definition | Canonical KPI ids |
|------------|------------|-------------------|
| Orders placed | Every order recorded on the Business Day (`OrderCreated` / P-10 `orderCount`) | `orderCount` |
| Orders completed (served) | Orders that reached `served` (`completedOrderCount` / sales) | `completedOrders`, `orderSales`, `averageOrder` |
| Orders pending (live) | Write-model status ∈ pending/preparing/ready | `pendingOrders` (ops) |
| Check paid | Paid Check outcomes | `revenue`, `paidCheckCount`, `averageCheck` |
| Settlement tender | Captured settlement transactions | Payment Method Analytics |

Each displayed Order Sales-adjacent count now belongs to **Orders completed (served)** only.

---

## 3. Presentation audit

**Defect:** Adjacent cards implied the same story (“today’s orders” vs “today’s order sales”) but used different populations.

**Fix:** Bind count to `completedOrders` + Product Semantics label “Completed Orders” / “الطلبات المكتملة”; add section note clarifying the population.

---

## 4. Dashboard redesign rationale

1. **Same population for paired cards** — Completed Orders ↔ Order Sales.  
2. **Layout pairing** — Today count + Today sales, then Month count + Month sales (directly comparable).  
3. **Section header** — `orderSalesAnalytics` + `orderSalesAnalyticsNote` (EN/AR).  
4. **Rollup lists** — show `completedOrders · orderSales` so detail rows match card semantics.  
5. **`orderCount` retained** in DTO / Excel Financial & Order Sales detail sheets (clearly labeled “Orders”) — not removed from the platform.

---

## 5. KPI terminology matrix

| Label EN | Label AR | KPI id | Meaning |
|----------|----------|--------|---------|
| Order Sales | مبيعات الطلبات | `orderSales` | Served order totals |
| Completed Orders | الطلبات المكتملة | `completedOrders` | Served order count |
| Orders | عدد الطلبات | `orderCount` | All placed (detail / non-adjacent) |
| Average Order | متوسط الطلب | `averageOrder` | Order Sales / Completed Orders |
| Check Revenue | إيرادات الشيكات | `revenue` | Paid checks (separate section) |
| Pending Orders | الطلبات المعلقة | `pendingOrders` | Live kitchen (Home) |

---

## 6. Files modified

| File | Change |
|------|--------|
| `shared/reporting-platform/productSemantics.ts` | Executive KPI ids; section note; clarifications |
| `client/src/components/dashboard/ReportsTab.tsx` | Cards, section, rollup display |
| `client/src/lib/reporting-exports/executiveSummaryPresentation.ts` | Captions + value bind |
| `client/src/lib/reporting-exports/__tests__/reportingExecutiveSummary.architecture.guards.test.ts` | Expectations |
| `client/src/lib/reporting-exports/__tests__/reportingExportAcceptance.samples.test.ts` | Reconciliation docs |
| `shared/reporting-platform/__tests__/reportingDashboardOrderKpiPresentation.architecture.guards.test.ts` | **Added** |
| `docs/engineering/programs/REPORTING-PRODUCT-SEMANTICS-1/TERMINOLOGY.md` | Adjacency rule |
| `docs/engineering/programs/REPORTING-DASHBOARD-ORDER-KPI-PRESENTATION-1/*` | This program |

---

## 7. UX validation

| Concern | Result |
|---------|--------|
| Operator comprehension | Count label explicitly “Completed Orders” |
| Ambiguity vs Order Sales | Section note + same population |
| EN / AR | `preferredKpiLabel` / SECTION_TERMINOLOGY |
| RTL / LTR | Existing `RestaurantKpiCard` / section styles |
| Desktop / tablet | Existing `kpiGridWide` |
| Accessibility | Labels unchanged in pattern (text content only) |
| Touch | No layout density change beyond card order |

---

## 8. Arabic terminology review

- Card: `الطلبات المكتملة اليوم` / `الطلبات المكتملة الشهر`  
- Sales: `مبيعات الطلبات اليوم` / `… الشهر`  
- Section note: clarifies المكتملة vs كل الطلبات المسجّلة  

---

## 9. English terminology review

- “Today's Completed Orders” / “Month Completed Orders”  
- “Today's Order Sales” / “Month Order Sales”  
- Note: “Completed (served) orders — comparable with Order Sales…”  

---

## 10. Dashboard / Excel / PDF consistency

| Medium | Count next to Order Sales | Status |
|--------|---------------------------|--------|
| Dashboard Reports | `completedOrders` | Aligned |
| Excel Executive | `completedOrders` | Aligned |
| Excel Financial / Order Sales sheets | Both Orders + Completed Orders labeled | OK (detail) |
| PDF | Same Executive VM (export still suspended) | Semantics aligned in code |
| Reporting API / DTO | Unchanged fields | Presentation selects which to show |

---

## 11. Restaurant-owner usability assessment

| Question | Answer after change |
|----------|---------------------|
| What does this count mean? | Completed (served) orders |
| Can I divide Sales ÷ Count? | Yes — same population as Average Order |
| Confusion with Check Revenue? | Still separate Check Revenue section |
| Confusion with Pending Orders on Home? | Distinct label + live ops context |

---

## 12. Risks discovered

| Risk | Mitigation |
|------|------------|
| Operators who wanted “all placed” count | Still available as `orderCount` in Excel detail; can add a future “Orders placed” card outside the Order Sales pair |
| Prior screenshots / training saying “Today's Orders” | Label now “Completed Orders” |
| Executive simplification docs citing `orderCount` | Superseded by this program for Executive selection |

---

## 13. Architectural decisions

1. **Align by population (bind `completedOrders`)**, not by renaming bare “Orders” while keeping all-created values.  
2. **Keep `orderCount` in the platform** for placed-order analytics; do not overload its label.  
3. **Executive Summary switches to `completedOrders`** so Dashboard = Excel operational snapshot.  
4. **No API/DTO/calculation changes.**

---

## 14. Final status

**Ready for review.** Presentation semantics for Order Sales-adjacent KPIs are consistent across Dashboard and Executive export paths.
