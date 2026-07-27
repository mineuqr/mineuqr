# Business Terminology Adoption Report

| Field | Value |
|-------|-------|
| **Program** | REPORTING-BUSINESS-TERMINOLOGY-FINANCIAL-GOVERNANCE-ADOPTION-1 |
| **Date** | 2026-07-27 |
| **Mode** | Presentation & Governance Adoption only |
| **Commit** | Pending approval (no commit / no push) |

## Permanent governance rule adopted

User-facing interfaces communicate in **Business Language**.  
Internal architecture continues in **Technical Architecture Language**.  
Business terminology does not dictate architecture; architecture terminology does not leak into UI.

## Approved mapping (presentation)

| Plane | Before (user-facing) | After (EN) | After (AR) |
|-------|----------------------|------------|------------|
| Financial | Gross Sales / Check Revenue / Check Sales / Session Sales | **Total Sales** | **إجمالي المبيعات** |
| Operational | Order Sales | **Sales Orders** | **مبيعات الطلبات** |
| Related | Daily Gross Sales | **Daily Total Sales** | إجمالي المبيعات اليومية |

## SSOT updated

- `shared/reporting-platform/productSemantics.ts` — `PREFERRED_KPI_LABELS`, `SECTION_TERMINOLOGY`, `SEMANTIC_CLARIFICATIONS`, `DEPRECATED_PRESENTATION_LABELS`
- `shared/reporting-platform/kpiDictionary.ts` — presentation `name` / definition prose (SQL formulas unchanged)

## Surfaces updated

Dashboard, Excel, PDF labels (via Product Semantics), Exec captions, Reports chrome, architecture guards, acceptance samples.

## Explicitly unchanged

KPI ids, DTO fields, APIs, formulas (computation), Settlement Record ownership, Order Read ownership, schema, migrations, ADRs (architecture docs).
