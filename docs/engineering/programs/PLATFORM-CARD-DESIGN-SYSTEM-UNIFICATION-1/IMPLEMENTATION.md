# IMPLEMENTATION — PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1

**Date:** 2026-07-28  
**Status:** COMPLETE — awaiting Architecture Authority approval  
**Do not commit / push / deploy**

---

## 1. Architecture decision

**Extend** `client/src/design-system/semantic-card` — do not create a second card package.

| Concern | Owner |
| --- | --- |
| Surface / elevation / border / glow / radius / motion | `tokens/panel.ts` |
| Tone (success / warning / danger / info / …) | `tokens/semanticTone.ts` |
| Executive categories (cash / card / refund / …) | `tokens/category.ts` |
| **Domain accents (Analytics / Payments / Kitchen / QR / …)** | `tokens/domain.ts` **(new)** |
| **Icon containers** | `tokens/icon.ts` **(new)** |
| **Card type recipes** | `tokens/cardType.ts` **(new)** |
| KPI | `SemanticKpiCard` |
| Executive | `SemanticExecutiveCard` |
| Empty | `SemanticEmptyState` |
| **Content / settings / feature / summary / …** | `SemanticSurfaceCard` **(new)** |

`ui/card` remains the layout primitive. Premium chrome always comes from semantic tokens / `SemanticSurfaceCard` / facades.

---

## 2. New primitives

### Domain colors (`tokens/domain.ts`)

Defined once:

| Domain | Hex source |
| --- | --- |
| analytics / information | `#22d3ee` |
| payments | `SEMANTIC_CATEGORY_HEX.cash` |
| revenue | `#fbbf24` |
| kitchen | `SEMANTIC_CATEGORY_HEX.tax` |
| orders / qr | `SEMANTIC_CATEGORY_HEX.orders` |
| growth | `SEMANTIC_CATEGORY_HEX.net` |
| success / warning / danger | tone-aligned greens / oranges / reds |

Each domain exposes `shell` / `icon` / `title` / `glow`.  
`LANDING_ACCENT_TO_DOMAIN` maps Landing `data-accent` keys → domains.

### Icon containers (`tokens/icon.ts`)

`SEMANTIC_ICON.md | sm | lg | brand` — restaurantDash / adminDash facades now re-export these (no local fork).

### Card types (`tokens/cardType.ts`)

All types inherit `SEMANTIC_PANEL_BASE`:

`standard` · `feature` · `summary` · `analytics` · `status` · `information` · `navigation` · `settings` · `preview` · `action` · `selection` · `empty` · `executive-kpi` (shell alias)

Optional `domain` + `interactive` modifiers.

### `SemanticSurfaceCard`

Thin wrapper around shadcn `Card` applying `semanticCardTypeClass`. Composition re-exports Header/Title/Description/Content/Footer/Action.

---

## 3. Migrations performed

### Dashboard (`pages/Dashboard.tsx`)
- Settings / menu / offers / hours / images / danger Cards: `bg-card border-border` → `dash.card`
- QR table tile → `dash.card`
- Empty cinematic shell → `dash.emptyPanel`
- Dialogs / AlertDialogs **unchanged** (`bg-card` — not content cards)

### Print workspace
- `CurrentPrinterCard` / `LocalConnectorCard` → `semanticCardTypeClass("status")` + `SEMANTIC_ICON`
- `ConnectorSessionCard` → `semanticPanel.inset`

### Register
- `CashDrawerSummaryCard` → `summary` + domain `payments`
- `FinancialShiftTenderSummaryCard` → `SEMANTIC_PANEL_BASE` + `SEMANTIC_CATEGORY_SURFACE.card`

### Ops tickets (chrome only — layouts/actions preserved)
- `KitchenExecutionCard` → `SEMANTIC_PANEL_BASE` (removed custom multi-shadow/ring)
- `OperationalCard` → panel + executive radius + hover glow
- `FleetScreenCard` → panel + `SEMANTIC_TONE.row` for status
- `OperationalBoardCard` → + `SEMANTIC_PANEL_BASE`

### Reporting
- `ReportingPeriodToolbar` → `restaurantDash.card` + cyan focus ring

### Marketing / customizers
- About / TemplateSelector / FontCustomizer / ColorCustomizer: `.cinematic-card` → `.landing-card`
- `index.css`: cinematic aliased to landing panel language; Landing accent hexes aligned to `SEMANTIC_DOMAIN_HEX`

### Facades
- `restaurantDashStyles` / `adminDashStyles` icon containers → `SEMANTIC_ICON`

---

## 4. Removed / collapsed duplicates

| Removed pattern | Replacement |
| --- | --- |
| Local print slate shells | `semanticCardTypeClass` / `semanticPanel.inset` |
| Register emerald/sky custom panels | Domain / category surfaces |
| Kitchen multi-shadow + ring recipe | `SEMANTIC_PANEL_BASE` |
| Fleet emerald/amber fill borders | `SEMANTIC_TONE.row.*` |
| Admin/restaurant local icon well strings | `SEMANTIC_ICON` |
| `.cinematic-card` distinct glass language | `.landing-card` / aliased CSS |
| Dashboard `bg-card` content Cards | `dash.card` (= semantic panel) |

---

## 5. Architecture guards

`client/src/design-system/semantic-card/__tests__/platformCardUnification.architecture.guards.test.ts`

Covers: barrel exports, Dashboard migration, print/register shells, ops tickets, icon facades, cinematic removal.

**Result:** 7/7 new guards PASS (19/19 with prior semantic-card suites).

---

## 6. Constraints honored

| Constraint | Result |
| --- | --- |
| Do not redesign workflows / layouts / pages | Pass — shell classes only |
| Do not change business logic | Pass |
| Do not duplicate / invent a second card system | Pass — extended semantic-card |
| Landing / Dashboard as SoT | Pass |
| No commit / push / deploy | Pass |

---

## 7. Usage guidance (post-unification)

```tsx
// KPI
<SemanticKpiCard label="…" value={…} icon={Icon} />

// Executive category
<SemanticExecutiveGrid cards={…} />

// Settings / feature / summary / navigation content
<SemanticSurfaceCard cardType="settings">…</SemanticSurfaceCard>
<SemanticSurfaceCard cardType="feature" domain="kitchen">…</SemanticSurfaceCard>

// Or facade on existing Card
<Card className={restaurantDash.card}>…</Card>
<Card className={semanticCardTypeClass("summary", { domain: "payments" })}>…</Card>
```

**Forbidden:** new `shadow-*` / `rounded-*` / `border-*-500` card chrome outside `design-system/semantic-card`.
