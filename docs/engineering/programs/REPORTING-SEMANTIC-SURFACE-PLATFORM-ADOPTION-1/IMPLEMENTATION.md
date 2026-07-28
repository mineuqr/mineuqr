# IMPLEMENTATION — REPORTING-SEMANTIC-SURFACE-PLATFORM-ADOPTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE  
**Do not commit / push / deploy**

---

## 1. Design-system changes

### `tokens/domain.ts`

- Documented Reporting as SSOT for domain business surfaces
- Added `DOMAIN_TO_REPORTING_CATEGORY` mapping
- `reportingCategoryParts()` reuses `SEMANTIC_CATEGORY_SURFACE` shells/icons/glows (optional col-span strip for `net`)
- Rebuilt `SEMANTIC_DOMAIN_SURFACE` as full Reporting shells (not border-only)
- Added `semanticDomainReportingSurfaceClass(domain)`
- Marked `SEMANTIC_DOMAIN_ACCENT` / `semanticDomainAccentClass` **deprecated** for business cards

### `tokens/cardType.ts`

- When `options.domain` is set, **Reporting surface replaces** `SEMANTIC_PANEL_BASE`
- Non-domain types keep cyan panel language

### `components/SemanticKpiCard.tsx`

- Domain (non-primary) shells use `semanticDomainReportingSurfaceClass` + premium surface class
- Primary hero KPIs keep amber primary panel (rare)

### Barrel `index.ts`

- Exports `DOMAIN_TO_REPORTING_CATEGORY` + `semanticDomainReportingSurfaceClass`

---

## 2. Call-site migrations

| Surface | Change |
| --- | --- |
| `KitchenExecutionCard` | `semanticDomainReportingSurfaceClass("kitchen")` |
| `OperationalCard` | `…("orders")` |
| `OperationalBoardCard` | `…("orders")` |
| `FleetScreenCard` | `…("analytics")` |
| `FinancialShiftTenderSummaryCard` | Reporting orders surface (removed panel+category stack) |
| `ShiftClosingSummaryDialog` tender / drawer cards | orders / payments Reporting surfaces |
| `CashDrawerSummaryCard` | Already `semanticCardTypeClass(…, { domain: "payments" })` — now full Reporting via cardType |
| Print status cards | Already domain via cardType — now full Reporting |
| Domain KPI call sites | Inherit via `SemanticKpiCard` domain prop (no per-page surface forks) |

---

## 3. Guards

| File | Role |
| --- | --- |
| `reportingSemanticSurfacePlatformAdoption.architecture.guards.test.ts` | New program guards |
| `semanticDomainColorAdoption.architecture.guards.test.ts` | Updated: Reporting surfaces on KPI/ops; accents deprecated-only |
| `platformCardUnification.architecture.guards.test.ts` | Updated: ops/register expect Reporting helpers |

---

## 4. Performance / constraints

- Reused existing tokens and CSS variables (`.semantic-card` lighting)
- No new libraries
- No duplicated Reporting shell strings at call sites
- No intentional glow/saturation increase beyond existing Reporting recipe

---

## 5. Verification

```bash
cd client && npx vitest run src/design-system/semantic-card/__tests__/reportingSemanticSurfacePlatformAdoption.architecture.guards.test.ts src/design-system/semantic-card/__tests__/semanticDomainColorAdoption.architecture.guards.test.ts src/design-system/semantic-card/__tests__/platformCardUnification.architecture.guards.test.ts
```
