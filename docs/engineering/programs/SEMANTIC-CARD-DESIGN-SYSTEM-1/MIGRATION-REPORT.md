# Migration Report — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Date:** 2026-07-28  
**Type:** Presentation migration only

---

## Phase summary

| Phase | Status |
| --- | --- |
| SSOT audit | Complete |
| Token package creation | Complete |
| Component package creation | Complete |
| Facade migration (executive / KPI / admin / empty) | Complete |
| Architecture guards | Complete (14 tests green) |
| Remaining badge/ops migrations | Deferred (observations) |

---

## File changes

### Created

- `client/src/design-system/index.ts`
- `client/src/design-system/semantic-card/index.ts`
- `client/src/design-system/semantic-card/tokens/{panel,semanticTone,category,value}.ts`
- `client/src/design-system/semantic-card/components/{SemanticKpiCard,SemanticExecutiveCard,SemanticSkeleton,SemanticEmptyState}.tsx`
- `client/src/design-system/semantic-card/__tests__/semanticCardDesignSystem.architecture.guards.test.ts`
- `docs/engineering/programs/SEMANTIC-CARD-DESIGN-SYSTEM-1/*`

### Migrated to adapters / facades

- `ExecutivePeriodDashboard.tsx` → `SemanticExecutive*`
- `ExecutivePeriodEmptyState.tsx` → `SemanticExecutiveEmptyState` / `SemanticExecutiveSkeleton`
- `RestaurantKpiCard.tsx` → `SemanticKpiCard` / `SemanticKpiSkeleton`
- `AdminStatCard.tsx` → `SemanticKpiCard`
- `RestaurantSectionStates.tsx` (`RestaurantSectionEmpty`) → `SemanticEmptyState`
- `reportingExecutiveColors.ts` → re-export DS hex
- `restaurantDashStyles.ts` → imports panel/tone/value
- `adminDashStyles.ts` → imports panel/tone/shell
- `landingDesignSystem.ts` → docs updated (SSOT pointer)

### Unchanged (by design)

- All reporting VMs / calculations
- KPI dictionary / product semantics
- APIs / DTOs / DB
- Settlement / Orders / Sessions / Business Identity

---

## Consumer guidance

**New code:**

```ts
import { SemanticKpiCard, SemanticExecutiveGrid } from "@/design-system/semantic-card";
```

**Existing imports** (`RestaurantKpiCard`, `AdminStatCard`, `ExecutivePeriodDashboardGrid`) remain valid compatibility adapters.

**Charts / strips:** continue importing `REPORTING_CATEGORY_HEX` (facade) or prefer `SEMANTIC_CATEGORY_HEX`.

---

## Rollback

Revert the design-system package and restore prior private `CATEGORY_STYLE` / dual panel strings. Not recommended — would reintroduce duplication.
