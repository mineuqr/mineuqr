# Removed Duplication Report — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Date:** 2026-07-28

---

## Eliminated

| Duplicate | Before | After |
| --- | --- | --- |
| Cyan panel base string | Defined in `restaurantDashStyles` AND `adminDashStyles` | Single `SEMANTIC_PANEL_BASE` |
| Shell gradient | Duplicated in restaurant + admin | Single `SEMANTIC_SHELL` |
| Executive category Tailwind map | Private `CATEGORY_STYLE` | `SEMANTIC_CATEGORY_SURFACE` |
| Executive category hex | `REPORTING_CATEGORY_HEX` standalone | Facade of `SEMANTIC_CATEGORY_HEX` |
| Category icons | Private `CATEGORY_ICON` | `SEMANTIC_CATEGORY_ICON` |
| KPI card implementations | Parallel Restaurant vs Admin shells | Both → `SemanticKpiCard` |
| Executive card implementation | Inline in dashboard file | `SemanticExecutiveCard` |
| Tone color literals | `restaurantSemantic` hardcodes | Mirrors `SEMANTIC_TONE` |
| Revenue value gradient | Hardcoded in restaurantDash | `SEMANTIC_VALUE` |
| Executive empty/skeleton | Local-only implementations | DS components + thin adapters |
| Section empty panel | Local markup | `SemanticEmptyState` |

---

## Not eliminated (documented observations)

| Item | Reason |
| --- | --- |
| Admin filled status pills (`statusActive` etc.) | Dense ops chrome; different visual weight than outline badges |
| Domain operational cards | Different interaction model; not Semantic KPI cards |
| Landing CSS `--landing-accent-*` | Presentation CSS bridge; hex families already align with category tokens |
| Multiple app-level empty states | Different product contexts (admin ops vs app shell) |

---

## Guardrails

Architecture test file:

`client/src/design-system/semantic-card/__tests__/semanticCardDesignSystem.architecture.guards.test.ts`

Asserts:

- Hex facade identity
- Surface completeness
- Tone completeness
- No private `CATEGORY_STYLE` reintroduction
- No hardcoded hex in `reportingExecutiveColors.ts`
