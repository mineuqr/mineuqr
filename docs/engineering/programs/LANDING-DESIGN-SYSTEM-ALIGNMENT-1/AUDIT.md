# AUDIT — LANDING-DESIGN-SYSTEM-ALIGNMENT-1

**Program:** LANDING-DESIGN-SYSTEM-ALIGNMENT-1  
**Status:** APPROVED (implementation complete — await Architecture Authority for commit / push / deploy)  
**Date:** 2026-07-28  
**Scope:** Unify public landing visual language with production dashboard without redesign.

---

## Source of truth

Production restaurant dashboard design system lives in:

`client/src/components/dashboard/restaurantDashStyles.ts`

Supporting semantic accents live in:

`client/src/components/dashboard/ExecutivePeriodDashboard.tsx` (`CATEGORY_STYLE`)

These — not the marketing-only oklch cinematic tokens from VISUAL-POLISH-1 — are the single source of truth for this program.

---

## Dashboard design patterns (extracted)

| Pattern | Recipe |
| --- | --- |
| Shell | `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` |
| Panel / card | `rounded-xl border border-cyan-500/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50 shadow-none` |
| Hover glow | `hover:border-cyan-400/30 hover:shadow-sm hover:shadow-cyan-500/10` + `transition-all duration-200` |
| Supporting KPI | `border-cyan-500/20 bg-slate-900/40` (lighter weight) |
| Hero panel | Panel + `border-cyan-500/25` + `from-slate-800/60 via-slate-900/70 to-slate-900/90` |
| Icon container | `rounded-xl border border-cyan-500/20 bg-slate-900/60 text-cyan-400` (h-9 / h-10) |
| Toolbar / ghost | `border-cyan-500/30 bg-slate-900/50` → cyan hover fill |
| Item row | `border-cyan-500/15 bg-slate-900/30` + cyan hover |
| Radius | `rounded-xl` primary; larger frames use `rounded-2xl` |
| Motion | 200ms; no heavy multi-shadow stacks |
| Typography colors | Titles `text-white`; body `text-slate-400`; muted `text-slate-500` |

### Semantic category accents (ExecutivePeriodDashboard)

| Domain | Border / shell | Icon |
| --- | --- | --- |
| Orders / QR | orange-500/35 → orange-950 | orange-400 |
| Ordering / tables | sky-500/35 → sky-950 | sky-400 |
| Kitchen | violet-500/35 → violet-950 | violet-400 |
| Payments / cash | emerald-500/35 → emerald-950 | emerald-400 |
| Analytics / mgmt | cyan panel language | cyan-400 |
| Growth / net | teal-500/40 → teal-950 | teal-300 |

---

## Landing page gap (before alignment)

After LANDING-PAGE-VISUAL-POLISH-1, the landing used a **parallel** visual language:

- oklch teal cinematic backgrounds (`#090d11` + multi-hue radials)
- Marketing glass with oklch borders unrelated to cyan-500/30 panels
- Cards with inset highlight + heavy drop shadows (not `shadow-none` + cyan hover)
- Icon wells tinted with `--accent` oklch mixes, not `bg-slate-900/60 border-cyan-500/20`
- Buttons/chips using `border-border` / `bg-white/[0.03]` instead of toolbar cyan recipes
- HeroPreview chrome with oklch glow strings and `primary` tokens that did not match dashboard slate/cyan chrome

**Result:** Landing felt premium but not like the same product as the dashboard.

---

## Constraints respected

- No section redesign or layout change
- No typography stack / spacing philosophy change
- No new palette outside MineuQR dashboard system
- No fabricated claims / metrics
- Prefer CSS; no new JS libraries
- Preserve `prefers-reduced-motion`

---

## Alignment strategy

1. Treat `restaurantDashStyles` as SSOT; add a thin bridge module for landing imports.
2. Rewrite `.landing-*` CSS recipes to slate/cyan panel language + Executive semantic shells.
3. Wire Home / HeroPreview / ProductJourney / Navbar to bridge + dashboard color hierarchy.
4. Keep category `data-accent` differentiation, but map hues to dashboard semantics.
5. Document outcomes for Architecture Authority.

---

## Related

- Prior: `../LANDING-PAGE-VISUAL-POLISH-1/`
- Prior: `../LANDING-PAGE-EXPERIENCE-1/`
- SSOT: `client/src/components/dashboard/restaurantDashStyles.ts`
