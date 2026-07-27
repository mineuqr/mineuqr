# REPORTING-UX-RATIONALIZATION-1 — Executive Audit Summary

| Field | Value |
|---|---|
| **Program** | REPORTING-UX-RATIONALIZATION-1 |
| **Phase** | Production Reporting Audit (Phases 1–7) |
| **Date** | 2026-07-27 |
| **Mode** | Audit only — **no implementation** |
| **Scope** | Restaurant Reporting Platform (`reporting.*`) + Excel exports + adjacent KPI surfaces |
| **Out of scope for change** | Financial formulas, SSOT, Check / SR / Refund / Custody ownership |

---

## Verdict

**AUDIT COMPLETE — IMPLEMENTATION NOT AUTHORIZED**

The platform already has a strong constitutional KPI registry and Settlement Record–based Net Revenue path. The reporting *experience* is fragmented: mixed time scopes on one dashboard, refund analytics export-only, and a **constitutional time-semantics gate** between certified Business Day month/year windowing and this program’s Gregorian month/year rule.

---

## What was audited

| Surface | Status |
|---------|--------|
| Restaurant dashboard Reports tab | Inventoried |
| Home Operational Snapshot / Sessions KPIs | Inventoried (adjacent) |
| Excel workbook (6 sheets) | Inventoried |
| KPI registry + Product Semantics | Reviewed |
| `reporting.*` API / aggregators / adapters | Inventoried |
| Refund presentation (live + export) | Reviewed |
| Business Day / month / year windowing | Validated against code |
| Admin commercial “reporting” | Noted as orthogonal (not restaurant KPI SSOT) |
| Register shift closing reports | Noted as custody/ops (not period reporting) |

---

## Top findings (executive)

1. **Check Revenue Overview is lifetime, not period-scoped** — `SettlementOverviewSection` calls `getBusinessMetricsSummary` with no `from`/`to`, while the month/year selector drives rollups, payment analytics, and Excel only. Dashboard and Excel do **not** show the same period truth today.

2. **Refund analytics are split and incomplete on the live dashboard** — Net Revenue appears in Overview; Refund Count / Publications / Rate / Trend / Payment refund mix are Excel-heavy; Payment Method VM builds refund rows but dashboard does not render them. **Refund by Operator / Register** do not exist on Reporting Platform (would consume Custody Attribution — presentation only; no money law change).

3. **Time semantics gate (Architecture Authority required)** — Certified code uses **Business Day windows** for daily keys and for month/year *bounds* (civil month label → first BD open → last BD close). This program requires **pure Gregorian calendar** month/year (never BD boundaries). Changing that alters which settlements fall in a month — it is a **window semantics change**, not pure UX. **Do not implement without a dedicated Architecture Decision.**

4. **KPI terminology is largely standardized** via `productSemantics.ts` / `kpiDictionary.ts`. Remaining synonym risk is mostly section chrome (“Reports & Statistics”, component names `Settlement*`) and admin commercial reuse of the word “reporting”.

5. **Excel is closer to executive grade than the live dashboard** — Financial + Payment sheets carry Gross / Net / Refund / Tax; Executive sheet is operational-only by prior design. Live dashboard lacks a unified Refund section and period-aligned Financial hierarchy.

---

## Deliverables index

| # | Document |
|---|----------|
| 1 | [FULL-REPORTING-INVENTORY.md](./FULL-REPORTING-INVENTORY.md) |
| 2 | [DUPLICATE-MATRIX.md](./DUPLICATE-MATRIX.md) |
| 3 | [BUSINESS-AND-FINANCIAL-MEANING-MATRIX.md](./BUSINESS-AND-FINANCIAL-MEANING-MATRIX.md) |
| 4 | [KPI-REGISTRY-REVIEW.md](./KPI-REGISTRY-REVIEW.md) |
| 5 | [TIME-SEMANTICS-VALIDATION.md](./TIME-SEMANTICS-VALIDATION.md) |
| 6 | [REFUND-REVIEW.md](./REFUND-REVIEW.md) |
| 7 | [EXCEL-REVIEW.md](./EXCEL-REVIEW.md) |
| 8 | [DASHBOARD-REVIEW.md](./DASHBOARD-REVIEW.md) |
| 9 | [UI-RATIONALIZATION-REPORT.md](./UI-RATIONALIZATION-REPORT.md) |
| 10 | [ARCHITECTURE-COMPLIANCE-REPORT.md](./ARCHITECTURE-COMPLIANCE-REPORT.md) |
| 11 | [PRODUCTION-ADOPTION-REPORT.md](./PRODUCTION-ADOPTION-REPORT.md) |

---

## Keep / Merge / Rename / Remove (preview)

| Action | Item | Rationale |
|--------|------|-----------|
| **KEEP** | Check Revenue, Order Sales, Net Revenue, Tax Collected, Paid Checks | Canonical dual-metric + Net law |
| **KEEP** | Excel 6-sheet skeleton | Sound executive structure; rationalize content |
| **MERGE (UX)** | Refund signals into one Refund section (dashboard + Excel) | Eliminate split Gross/Net/Refund cognitive load |
| **MERGE (UX)** | Home vs Sessions overlapping ops KPIs | One operational snapshot pattern |
| **RENAME (labels only)** | Section titles that say bare “Sales/Revenue” | Align to Product Semantics |
| **REMOVE (presentation)** | Catalog Overview from financial Reports tab (candidate) | Catalog ≠ executive financial reporting |
| **REMOVE (dead)** | `/admin/reports` placeholder as “reports product” | Real admin analytics live elsewhere |
| **DEFER** | Gregorian month/year window rewrite | Architecture gate — see Time Semantics |
| **DEFER** | Refund by Operator / Register | Needs Custody Attribution read models (ADR-033); no formula change |

---

## Explicit non-actions taken

- No UI code changed  
- No Excel builder changed  
- No KPI formula / aggregator / adapter changed  
- No ADR / SSOT modified  

---

## Next step (requires approval)

Architecture Authority must choose **Option A or B** in [TIME-SEMANTICS-VALIDATION.md](./TIME-SEMANTICS-VALIDATION.md). Only after that decision may a sequenced UX adoption program implement Keep/Merge/Rename/Remove from this audit.
