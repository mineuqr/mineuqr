# UXR-1C — Header & Hierarchy Refinement

**Program:** ADMIN-DASHBOARD-UX-REFINE-1  
**Task:** UX-REFINE-1C  
**Scope:** `/admin` overview only — hierarchy and density; no logic, routing, permissions, or API changes.  
**Visual authority preserved:** UXR-1B Pricing-page tokens unchanged.

## Objective

Transform `/admin` from a landing-style dashboard into an operations console: KPIs first, less vertical waste, no welcome hero.

## Before (UXR-1A findings)

| Issue | Effect |
|-------|--------|
| Loose shell (`py-6`, `space-y-8`) | Hero-like vertical rhythm |
| Page title + subtitle + welcome + KPI title | Four-level title stack |
| Welcome block (`مرحباً` / sidebar guidance) | Marketing onboarding feel |
| Status badge legend below header (`mt-4`) | Extra row before content |
| Tall KPI cards + `space-y-4` sections | KPIs pushed below fold |

## After

| Change | Effect |
|--------|--------|
| `compact` shell + `overviewMain` spacing | Tighter header and main (`py-2`, `space-y-3`) |
| Subtitle removed on overview | Single operational page title |
| Welcome section removed from composition | No hero copy between header and KPIs |
| KPI section title removed | Hierarchy: **Title → KPIs** (not Title → Welcome → Overview → KPIs) |
| Status badges inline in `headerActions` | Legend without extra vertical strip |
| Compact KPI cards + tighter grids | KPI strip visible sooner |
| Compact section headings for shortcuts | Lower visual weight below KPIs |

## Hierarchy (new)

```
Breadcrumb bar (h-14)
└─ Page title (compact) + status badge legend (inline)
└─ KPI grid (no section H2)
└─ Shortcuts (compact H2)
└─ All sections (compact H2)
```

## Removed Elements

- `OverviewWelcomeSection` from `LaunchReadinessOverviewComposition` (component file retained for registry exports; no longer rendered on `/admin`)
- Page subtitle on overview (`admin.nav.homeSubtitle` not passed)
- KPI section visible title (`admin.kpiOverview` — retained as `aria-label` for accessibility)
- Status indicator strip below header (replaced by compact inline badges)

## Spacing Changes

| Token / area | Before | After |
|--------------|--------|-------|
| Shell main (overview) | `space-y-8 py-6 sm:py-8` | `overviewMain`: `space-y-3 py-2 sm:py-3` |
| Composition workspace | implicit `space-y-8` | `overviewWorkspace`: `space-y-3` |
| KPI grid gap | `gap-3 sm:gap-4` | `gap-2 sm:gap-3` |
| Shortcut cards | `p-4 gap-3` | `p-3 gap-2.5` |
| Section internal | `space-y-4` | `tight`: `space-y-2` |
| KPI card padding | default | `compact` variant (smaller header/value/hint) |
| Loading skeleton | `min-h-[120px]` | `min-h-[96px]` |

## Files Changed

| File | Change |
|------|--------|
| `pages/admin/AdminDashboardHome.tsx` | `compact` shell, no subtitle, inline status badges, `overviewMain` |
| `domains/launch-readiness/LaunchReadinessOverviewComposition.tsx` | Remove welcome; wrap in `overviewWorkspace` |
| `domains/reports/ReportsHomeKpiSection.tsx` | Titleless KPI strip, compact cards, tight spacing |
| `domains/reports/ReportsStatusIndicator.tsx` | `compact` prop — badges only, inline |
| `sections/AdminPageSection.tsx` | Optional title, `titleVariant`, `tight` spacing, `ariaLabel` |
| `sections/adminSectionContracts.ts` | Contract updates |
| `sections/overview/OverviewFeaturedShortcutsSection.tsx` | Compact title + tight spacing |
| `sections/overview/OverviewAllSectionsSection.tsx` | Compact title + tight spacing |
| `sections/overview/NavShortcutCard.tsx` | Denser card padding |
| `layout/AdminStatCard.tsx` | `compact` density variant |
| `layout/adminDashStyles.ts` | `overviewMain`, `overviewWorkspace` tokens |

## First-Screen Target

On a standard laptop viewport (~768–900px height), the compressed stack aims to show:

1. Breadcrumb + compact page title with badge legend  
2. Full KPI row (5 cards / 2-col mobile)  
3. Start of shortcut navigation cards  

without scrolling.

## Validation

```bash
npm run check
npm test
```

## Success Criteria

- ✓ Overview feels like a console (not a landing page)
- ✓ Hero feeling reduced (compact title, no subtitle, no welcome)
- ✓ Welcome block removed from render path
- ✓ KPIs promoted to first content block
- ✓ Less scrolling required
- ✓ Stronger hierarchy (Title → KPIs → Nav)
- ✓ Pricing-page visual language preserved (UXR-1B tokens untouched)
