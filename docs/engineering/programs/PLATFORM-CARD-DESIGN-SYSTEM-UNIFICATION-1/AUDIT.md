# AUDIT — PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1

**Date:** 2026-07-28  
**Status:** COMPLETE  
**Visual reference:** Landing Page + Production Dashboard (Semantic Card Design System)  
**Do not commit / push / deploy**

---

## 1. Single Source of Truth (confirmed)

| Layer | Path | Role |
| --- | --- | --- |
| Design system package | `client/src/design-system/semantic-card/` | Panel, tone, category, domain, icon, card-type tokens + components |
| Restaurant facade | `client/src/components/dashboard/restaurantDashStyles.ts` | Re-exports panel / KPI / icon recipes |
| Admin facade | `client/src/components/admin/layout/adminDashStyles.ts` | Re-exports panel / icon recipes |
| Landing bridge | `client/src/components/landing/landingDesignSystem.ts` + `.landing-card` in `index.css` | Mirrors `SEMANTIC_PANEL_BASE` |
| Layout primitive | `client/src/components/ui/card.tsx` | shadcn structure only — **not** premium chrome |

Canonical panel string:

```
rounded-xl border border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none
```

Hover: `hover:border-cyan-400/30 hover:shadow-sm hover:shadow-cyan-500/10`  
Motion: `transition-all duration-200`  
Radius: `rounded-xl` (KPI/content) / `rounded-2xl` (executive / feature)

---

## 2. Inventory — visual languages found (pre-unification)

| ID | Language | Recipe | Primary locations |
| --- | --- | --- | --- |
| A | Shadcn default | `bg-card border rounded-xl shadow-sm` | Auth, Profile, Contact, Dashboard settings (pre-migration), commercial diagnostics |
| B | Semantic cyan panel | `SEMANTIC_PANEL_BASE` + cyan glow | Reporting KPIs, admin ops, Pricing plans, restaurant panels |
| C | Semantic supporting | Weaker cyan `/20` + `bg-slate-900/40` | Supporting KPIs |
| D | Semantic primary KPI | Amber border + denser gradient | Rare hero KPIs |
| E | Executive category | `rounded-2xl` + category shell/glow + lift | ExecutivePeriodDashboard |
| F | Slate print ops | `border-slate-800 bg-slate-900/30–40` | Print workspace *Cards |
| G | Status ticket | Custom multi-shadow + ring | KitchenExecutionCard |
| H | Fleet status fills | Emerald/amber tinted borders + `shadow-sm` | FleetScreenCard |
| I | Register accent forks | Emerald / sky filled summaries | CashDrawer / Tender cards |
| J | Landing CSS | `.landing-card` + domain accents | Home, ProductJourney, HeroPreview |
| K | Cinematic legacy | `.cinematic-card` blur glass | About, Template, Font/Color, Dashboard empty |
| L | Platform empty | Dashed muted / destructive | AppEmptyState family |

---

## 3. Named `*Card*` components audited

| Component | Pre-state | Action |
| --- | --- | --- |
| `SemanticKpiCard` | Canonical | Keep |
| `SemanticExecutiveCard` | Canonical | Keep |
| `SemanticEmptyState` | Canonical | Keep |
| `SemanticSurfaceCard` | **New** | Platform content shell |
| `DiningSessionSummaryCard` | Semantic KPI | Keep |
| `OperationalBoardCard` | Tone row only | + `SEMANTIC_PANEL_BASE` |
| `OperationalCard` | Custom shadow | → semantic panel + executive radius |
| `KitchenExecutionCard` | Custom multi-shadow/ring | → `SEMANTIC_PANEL_BASE` |
| `FleetScreenCard` | Status fill forks | → panel + `SEMANTIC_TONE.row` |
| `CurrentPrinterCard` / `LocalConnectorCard` / `ConnectorSessionCard` | Slate F | → cardType / inset |
| `CashDrawerSummaryCard` | Emerald fork I | → domain `payments` |
| `FinancialShiftTenderSummaryCard` | Sky fork I | → `SEMANTIC_CATEGORY_SURFACE.card` |
| `NavShortcutCard` | `adminDash.card` | Already tokenized |
| `AllocationSummaryCard` | Plain `<dl>` | Out of scope (not a surface) |
| `ui/card` | Layout primitive | Keep as structure host |

---

## 4. Inconsistency findings

### Borders
- Cyan `/30` (SoT) vs `border-border` / `border-slate-800` / status emerald/amber forks / cinematic oklch borders.

### Shadows
- SoT: `shadow-none` at rest, soft cyan glow on hover.
- Divergences: shadcn `shadow-sm`, kitchen multi-layer rgba shadows, fleet `shadow-sm`, cinematic blur elevation.

### Radius
- SoT: `rounded-xl` / executive `rounded-2xl`.
- Divergences: density-driven kitchen radius (kept as layout density, shell now semantic), mixed cinematic `rounded-xl/2xl`.

### Icon containers
- SoT: slate well + cyan border (`SEMANTIC_ICON`).
- Divergences: admin cyan fill well (pre-migration), print `bg-primary/10` / `bg-slate-800` wells.

### Hover
- SoT: border brighten + cyan glow (`SEMANTIC_HOVER_GLOW`).
- Divergences: `hover:border-primary`, cinematic border color swaps, custom ticket rings.

### Accent colors
- Landing CSS hexes partially drifted from category SSOT (`payments` was `#4ade80` vs cash `#34d399`).
- Register summaries invented local emerald/sky shells instead of domain/category surfaces.

---

## 5. Prior program coverage

| Program | Covered |
| --- | --- |
| SEMANTIC-CARD-DESIGN-SYSTEM-1 | Panel / tone / category / KPI / executive |
| SEMANTIC-CARD-VISUAL-CONSISTENCY-1 | KPI emphasis + grids |
| SEMANTIC-CARD-PLATFORM-ADOPTION-1 | KPI/executive adoption; deferred domain tickets |
| LANDING-DESIGN-SYSTEM-ALIGNMENT-1 | Landing CSS mirror |

**Gap this program closes:** content/settings/ops/print/register/marketing surfaces still on languages A/F/G/H/I/K.

---

## 6. Migration priority (executed)

### High (done)
1. Dashboard settings / menu / offers / hours / QR Cards → `dash.card`
2. Print workspace Cards → semantic status / inset
3. Kitchen / Operational / Fleet tickets → `SEMANTIC_PANEL_BASE` (+ tone rows)
4. CashDrawer / Tender → domain / category surfaces

### Medium (done this pass)
5. ReportingPeriodToolbar → `restaurantDash.card`
6. `.cinematic-card` call sites → `.landing-card`; CSS alias aligned
7. Icon containers → `SEMANTIC_ICON` via restaurant/admin facades
8. Domain + card-type token architecture + `SemanticSurfaceCard`

### Deferred (documented recommendations)
9. Auth / subscription / Profile / Notifications form Cards (language A on themed shells — keep shadcn for dialogs/forms until a dedicated auth-surface pass)
10. Commercial diagnostics + Health Features Cards
11. `AppEmptyState` family vs `SemanticEmptyState` consolidation
12. Full TS-token replacement of `.landing-card` CSS (CSS remains intentional Landing bridge)
