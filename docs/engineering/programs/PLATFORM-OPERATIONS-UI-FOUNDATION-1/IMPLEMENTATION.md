# IMPLEMENTATION — PLATFORM-OPERATIONS-UI-FOUNDATION-1

**Date:** 2026-07-29  
**Mode:** Architecture-Governed Production Implementation  
**Scope:** Presentation layer only

## Constraints honored

| Constraint | Status |
|---|---|
| No business logic changes | ✓ |
| No API / tRPC contract changes | ✓ |
| No permissions changes | ✓ |
| No Realtime / observability / metrics / health-rule changes | ✓ |
| No navigation / routing changes | ✓ |
| No new color palette | ✓ — MineuQR semantic tokens only |
| No commit / push / deploy | ✓ |

## Package location

`client/src/design-system/platform-ops-ui/`

Chosen over a parallel `shared/platform-ui/` tree so Platform Ops facades live next to the design-system SSOT they compose (semantic-card, semantic-badge, semantic-table, semantic-section-state).

## Foundation catalog

| Component | Facade over |
|---|---|
| `PlatformOpsHeaderMeta` | StatusBadge + meta typography |
| `PlatformOpsHeroSummary` | Metric grid + status + alerts slots |
| `PlatformOpsSection` | `AdminSection` console density |
| `PlatformOpsMetricCard` / `MetricGrid` | `SemanticKpiCard` / `SEMANTIC_KPI_GRID` |
| `PlatformOpsStatusBadge` | `StatusBadge` + health map |
| `PlatformOpsTable*` / `DataTable` | Semantic Table Platform |
| `PlatformOpsToolbar` | `SemanticTableToolbar` + Filters |
| `PlatformOpsAlert` / `AlertList` | StatusBadge + semantic panel inset |
| `PlatformOpsEmpty/Loading/Error/Refreshing` | Semantic Section State |
| `PlatformOpsChartFrame` | Shared chart chrome (body supplied by features) |
| `PlatformOpsModuleTile` | adminDash card + status badge |

## Status system

`healthy | warning | degraded | unavailable | unknown` → existing badge tones via `mapPlatformOpsHealthToBadgeTone`.

Alert severities: `info | success | warning | critical`.

## Adoption surface

| File | Change |
|---|---|
| `PlatformOpsWorkspaceShell` | `PLATFORM_OPS_UI.sections` token |
| `PlatformOpsOverviewComposition` | Section + ModuleTile |
| `PlatformOpsRealtimeComposition` | Full foundation adoption |
| `PlatformOpsHealthComposition` | PlatformOpsSection wrapper |
| `PlatformOpsReservedSection` | Section + EmptyState |
| `design-system/index.ts` | Barrel export |
| `en.json` / `ar.json` | Presentation labels only (`retry`, `lastUpdated`, `noChannels`) |

## Explicit non-changes

- `adminRoutes.ts`, `adminRouteRegistry.ts`, `platformOpsSections.ts` paths/ids
- `App.tsx` route wiring
- Realtime observability server packages
- Health rule evaluation
- Permissions / auth gates (still `useAuthGate` + shell)

## Guards

`client/src/design-system/platform-ops-ui/__tests__/platformOpsUiFoundation.architecture.guards.test.ts`
