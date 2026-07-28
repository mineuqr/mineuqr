# Reuse Matrix — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Date:** 2026-07-28

| Existing asset | Decision | Action |
| --- | --- | --- |
| `restaurantDashStyles` panel string | **REUSE → promote** | Import `SEMANTIC_PANEL_BASE` |
| `adminDashStyles` panel string | **REUSE → promote** | Import `SEMANTIC_PANEL_BASE` |
| `restaurantSemantic` | **REUSE → mirror** | Values from `SEMANTIC_TONE` |
| `adminSemantic` icons/rows | **REUSE → mirror** | Rows/icons from `SEMANTIC_TONE` |
| `REPORTING_CATEGORY_HEX` | **REUSE → facade** | Re-export `SEMANTIC_CATEGORY_HEX` |
| `CATEGORY_STYLE` (private) | **REMOVE** | Replaced by `SEMANTIC_CATEGORY_SURFACE` |
| `CATEGORY_ICON` (private) | **REMOVE** | Replaced by `SEMANTIC_CATEGORY_ICON` |
| `RestaurantKpiCard` | **REUSE → adapter** | Wraps `SemanticKpiCard` |
| `AdminStatCard` | **REUSE → adapter** | Wraps `SemanticKpiCard` |
| `ExecutivePeriodKpiCard` | **REUSE → adapter** | Wraps `SemanticExecutiveCard` |
| `ExecutivePeriodEmptyState` | **REUSE → adapter** | Wraps `SemanticExecutiveEmptyState` |
| `RestaurantSectionEmpty` | **REUSE → adapter** | Wraps `SemanticEmptyState` |
| `RestaurantKpiGridSkeleton` | **REUSE → adapter** | Wraps `SemanticKpiSkeleton` |
| `kpiDictionary` / `productSemantics` | **REUSE as-is** | Data authority unchanged |
| `executivePeriodDashboard` VM | **REUSE as-is** | No calculation changes |
| `landingDesignSystem` | **REUSE** | Continues via restaurantDash facade |
| `ui/card`, `ui/skeleton` | **REUSE** | Primitives under Semantic cards |
| Kitchen / Fleet / Operational cards | **KEEP domain-owned** | Not KPI Semantic Card forks |
| Register / Commercial status badges | **DEFER** | Observation — migrate later to `SEMANTIC_TONE.badge` |
| `CommercialOverviewExecutiveKpis` local skeleton | **DEFER** | Observation — switch to `SemanticKpiSkeleton` |
| `OperationsBar` inline tones | **DEFER** | Observation — consume `SEMANTIC_TONE` |
| `AppEmptyState` / `AdminEmptyState` | **KEEP** | App/admin chrome; not card-surface empty |
