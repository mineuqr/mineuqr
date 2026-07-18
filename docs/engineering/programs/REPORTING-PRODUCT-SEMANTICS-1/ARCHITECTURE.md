# REPORTING-PRODUCT-SEMANTICS-1 — Architecture

## Separation of concerns

| Layer | Responsibility |
|-------|----------------|
| KPI Governance | Stable id, formula, owner, calculationVersion |
| Product Semantics | Preferred user-facing label (EN/AR), deprecated synonyms |
| Presentation | Consumes preferred labels; never invents formulas |

## Ownership

- Registry: `shared/reporting-platform/productSemantics.ts`
- English name alignment: `KPI_DICTIONARY.name`
- Client helper: `client/src/lib/reporting/kpiDisplay.ts` → `preferredKpiLabel`
- Exports: `client/src/lib/reporting-exports/labels.ts`

## Non-goals

- No API / DTO / formula / id changes
- No Check ↔ Order Sales value remapping
- No admin SaaS metric rename in this program
