# UXR-1B — Admin Dashboard Visual System Alignment

**Program:** UX-REFINE-1B  
**Visual authority:** Pricing page (`client/src/pages/Pricing.tsx`, https://www.mineuqr.com/pricing)  
**Scope:** Presentation only — no route, permission, or business-logic changes.

## Objective

Align the Admin Dashboard with the Pricing page design language so both screens feel like the same product. Reuse existing Pricing patterns only; do not introduce new accents, glows, or card treatments.

## Pricing Page Patterns Adopted

| Element | Pricing source | Admin token / usage |
|--------|----------------|---------------------|
| Shell background | `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` | `adminDash.shell` |
| Top nav | `border-border/30 bg-background/60 backdrop-blur-xl` | `adminDash.nav`, operations header |
| Plan cards | `border-cyan-500/30`, inner `from-slate-800/50 to-slate-900/50`, `hover:border-cyan-400` | `adminDash.card`, `kpiCard`, `operationsCard` |
| Typography | `text-white` titles, `text-cyan-300` subtitles, `text-slate-400` metadata | `pageTitle`, `pageSubtitle`, `sectionTitle`, `sectionSub` |
| Icons | `text-cyan-400`, `bg-cyan-500/10` containers | `iconContainer`, KPI icons |
| Brand mark | `from-cyan-500 to-cyan-400` gradient badge | `brandIcon` (sidebar) |
| Primary actions | `border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10` | `adminActionBtn.primary` |
| Warning / promo | Orange (`orange-500`, `orange-400`) | `adminSemantic.statusWarning`, coming-soon indicator |
| Success | Green | `adminSemantic.statusActive`, `iconActive` |
| Danger | Red | `adminSemantic.statusDanger`, `iconDanger` |
| Trial (brand) | Cyan CTA (`bg-cyan-500 text-slate-900`) | `adminSemantic.statusTrial` (replaces blue trial) |

## Removed / Consolidated

- `shellGlow` radial overlay (not on Pricing page)
- `cinematic-bg` shell in favor of explicit Pricing gradient
- `adminActionBtn.info` (blue) and `adminActionBtn.teal` → `primary` (cyan)
- Competing KPI icon colors (blue, emerald, yellow, accent) → cyan or semantic tokens
- `statDash` duplicate tokens in `StatisticsPanel` → shared `adminDash`
- Purple from pie chart palette → slate neutral

## Files Changed

### Central tokens
- `client/src/components/admin/layout/adminDashStyles.ts` — full rewrite; added `adminSemantic`
- `client/src/components/admin/layout/index.ts` — export `adminSemantic`

### Shell & layout
- `AdminOperationsShell.tsx` — remove glow, Pricing nav/header borders, transparent inset
- `AdminPageShell.tsx` — remove glow, Pricing borders, cyan brand icon
- `AdminDashboardSidebar.tsx` — cyan brand gradient, Pricing border/typography
- `AdminSection.tsx`, `AdminStatCard.tsx`, `NavShortcutCard.tsx` — Pricing card + typography
- `AdminEmptyState.tsx`, `PlaceholderComingSoonIndicator.tsx` — Pricing icon/orange patterns

### Commercial & operations
- `CommercialStatusBadge.tsx` — trial → cyan; grace → orange
- `CommercialOverviewSubscriptionHealth.tsx` — `adminSemantic` card/icon accents
- `CustomerSuccessAccountsSection.tsx` — trial badge + action buttons aligned
- `StatisticsPanel.tsx` — shared tokens, unified icons, semantic status grid

## Semantic Color Contract

| Role | Token | Use |
|------|-------|-----|
| Brand / trial | Cyan | Trial badges, primary actions, icons, borders |
| Success | Green | Active subscription |
| Warning | Orange | Grace, canceled, coming-soon, bulk actions |
| Danger | Red | Expired, destructive actions |
| Neutral | Slate | Metadata, inactive, table chrome |

## Validation

**Logo test:** With the logo removed, admin screens now share Pricing’s slate gradient shell, cyan-bordered cards, white/cyan typography hierarchy, and the same accent palette (cyan + orange + green + red).

**Not in scope:** Owner `Dashboard.tsx`, notifications, about page — those remain on their existing systems until a separate alignment pass.

## Verification

```bash
npm run check
npm test
```
