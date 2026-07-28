# Design System Specification — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Program:** SEMANTIC-CARD-DESIGN-SYSTEM-1  
**Layer:** Presentation only  
**Package:** `client/src/design-system/semantic-card/`  
**Date:** 2026-07-28

---

## Purpose

Elevate MineuQR Executive Cards into the official platform **Semantic Card Design System**.

Standardize presentation for:

- Executive Cards
- KPI Cards
- Analytics Cards (category surfaces)
- Summary Cards
- Compact Cards
- Empty States
- Skeleton / Loading States

Without changing business logic, reporting calculations, APIs, DTOs, or databases.

---

## Ownership model

| Concern | Canonical owner | Notes |
| --- | --- | --- |
| KPI formulas / IDs | `shared/reporting-platform/kpiDictionary.ts` | Unchanged |
| KPI labels / visual tiers | `shared/reporting-platform/productSemantics.ts` | Unchanged |
| Executive period VM | `client/src/lib/reporting-exports/executivePeriodDashboard.ts` | Values only |
| Panel chrome | `design-system/semantic-card/tokens/panel.ts` | **NEW SSOT** |
| Semantic tones | `design-system/semantic-card/tokens/semanticTone.ts` | **NEW SSOT** |
| Executive categories (hex + surface) | `design-system/semantic-card/tokens/category.ts` | **NEW SSOT** |
| Value typography | `design-system/semantic-card/tokens/value.ts` | **NEW SSOT** |
| Card components | `design-system/semantic-card/components/*` | **NEW SSOT** |

Facades (must not redefine tokens):

- `restaurantDashStyles.ts` → imports panel/tone/value
- `adminDashStyles.ts` → imports panel/tone/shell
- `reportingExecutiveColors.ts` → re-exports `SEMANTIC_CATEGORY_HEX`
- `RestaurantKpiCard` / `AdminStatCard` / `ExecutivePeriodDashboard` → thin adapters

---

## Principles

1. **One owner per semantic definition**
2. **Reuse before recreate** — adapters wrap DS; do not fork
3. **Data stays in platform registries** — cards never invent KPIs
4. **Presentation only** — no services, repositories, settlement, orders, BI
5. **Adaptive layouts** — responsive grids; RTL via `dir` / language props
6. **Motion-safe** — `motion-safe:` + focus rings; respect reduced motion

---

## Token layers

### Panel (`tokens/panel.ts`)

- `SEMANTIC_PANEL_BASE` — cyan slate panel (single string)
- `SEMANTIC_HOVER_GLOW` / `SEMANTIC_MOTION` / `SEMANTIC_SHELL`
- `semanticPanel.*` — card, kpi, kpiPrimary, kpiSupporting, empty, error, hero, focusRing

### Tone (`tokens/semanticTone.ts`)

Tones: `neutral | info | success | warning | danger | accent`  
Maps: icon / row / badge / value  
Helper: `legacyToneToSemanticTone`

### Category (`tokens/category.ts`)

Categories: `cash | card | refund | tax | orders | net | neutral`  
Exports: `SEMANTIC_CATEGORY_HEX`, `SEMANTIC_CATEGORY_SURFACE`, `SEMANTIC_CATEGORY_ICON`, `semanticCategoryFill`

### Value (`tokens/value.ts`)

- operational (white)
- revenue / revenuePrimary (amber–orange gradient)

---

## Component variants

| Variant | Component | Use |
| --- | --- | --- |
| Standard KPI | `SemanticKpiCard` emphasis `secondary` | Section KPI strips |
| Primary KPI | `SemanticKpiCard` emphasis `primary` | Hero metric |
| Supporting | `SemanticKpiCard` emphasis `supporting` | Dense secondary |
| Compact | `SemanticKpiCard` emphasis `compact` | Admin strips |
| Executive | `SemanticExecutiveCard` | Interactive category cards |
| Executive grid | `SemanticExecutiveGrid` | Today / Month boards |
| Empty | `SemanticEmptyState` panel \| premium | Section / executive empty |
| Skeleton | `SemanticKpiSkeleton` / `SemanticExecutiveSkeleton` | Loading |

---

## Accessibility

- Keyboard: Enter / Space on interactive executive cards
- Focus: cyan focus ring (`semanticPanel.focusRing`)
- Screen readers: `aria-label` on executive cards; `role="status"` / `aria-busy` on empty/skeleton
- RTL: value `dir="ltr"` for numbers; drill chevron flips by language
- Contrast: slate-400 labels on dark panels; category value colors at 300–400 weight

---

## Responsive

- KPI grids: 2 → 3 → 5 columns (via consumer `restaurantDash.kpiGrid`)
- Executive grid: 1 → 2 → 3 columns; `net` spans 2 on sm+
- Touch: min-height 7.5rem on executive cards; active scale feedback

---

## Prohibited

Do not put formulas, payment method constants, tax policy, currency math, or channel registries inside this package.
