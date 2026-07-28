# Component Catalog — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Package:** `@/design-system/semantic-card`  
**Date:** 2026-07-28

---

## Public API

Import from:

```ts
import {
  SemanticKpiCard,
  SemanticExecutiveCard,
  SemanticExecutiveGrid,
  SemanticEmptyState,
  SemanticExecutiveEmptyState,
  SemanticKpiSkeleton,
  SemanticExecutiveSkeleton,
  SEMANTIC_CATEGORY_HEX,
  SEMANTIC_CATEGORY_SURFACE,
  SEMANTIC_TONE,
  semanticPanel,
} from "@/design-system/semantic-card";
```

---

## Cards

### `SemanticKpiCard`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `label` | string | required | From KPI registry / preferred label |
| `value` | string \| number | required | Pre-formatted by caller |
| `icon` | Lucide/component | required | Caller supplies; not hardcoded domain maps |
| `tone` | SemanticTone \| legacy | `neutral` | Icon color only |
| `valueVariant` | `operational` \| `revenue` | `operational` | Typography |
| `emphasis` | `primary` \| `secondary` \| `supporting` \| `compact` | `secondary` | Shell weight |
| `hint` | string | — | Caption |
| `loading` | boolean | false | Inline skeleton |
| `valueDir` | ltr/rtl/auto | `ltr` | RTL-safe numbers |

**Facades:** `RestaurantKpiCard`, `AdminStatCard`

### `SemanticExecutiveCard` / `SemanticExecutiveGrid`

| Prop | Notes |
| --- | --- |
| `card` | `{ id, category, label, value, caption }` from executive VM |
| `onActivate` | Optional drill; enables keyboard + hover lift |
| `language` | `en` \| `ar` — drill hint + chevron |

**Facade:** `ExecutivePeriodKpiCard`, `ExecutivePeriodDashboardGrid`

---

## States

### `SemanticEmptyState`

- `variant="panel"` — section empty (cyan panel)
- `variant="premium"` — executive empty (teal ambient)

### `SemanticExecutiveEmptyState`

Premium convenience wrapper.

**Facades:** `RestaurantSectionEmpty`, `ExecutivePeriodEmptyState`

### `SemanticKpiSkeleton` / `SemanticExecutiveSkeleton`

Grid loading placeholders with `aria-busy`.

**Facades:** `RestaurantKpiGridSkeleton`, `ExecutivePeriodDashboardSkeleton`

---

## Tokens (consumable without components)

| Export | Purpose |
| --- | --- |
| `SEMANTIC_PANEL_BASE` | Cyan panel string |
| `semanticPanel` | Panel recipe object |
| `SEMANTIC_TONE` | Tone class maps |
| `SEMANTIC_CATEGORY_HEX` | Chart / strip colors |
| `SEMANTIC_CATEGORY_SURFACE` | Executive card shells |
| `SEMANTIC_CATEGORY_ICON` | Category icons |
| `SEMANTIC_VALUE` | Revenue / operational value classes |

---

## Out of catalog (intentionally domain-owned)

These remain domain components (not Semantic Card forks):

- `KitchenExecutionCard`
- `OperationalCard` / `OperationalBoardCard`
- `FleetScreenCard`
- Settlement / Register summary cards
- Print workspace cards

They may **consume** `SEMANTIC_TONE` / `semanticPanel` over time; they must not redefine category hex maps.
