# IMPLEMENTATION — LANDING-DESIGN-SYSTEM-ALIGNMENT-1

**Program:** LANDING-DESIGN-SYSTEM-ALIGNMENT-1  
**Date:** 2026-07-28  
**Status:** Implementation complete — await Architecture Authority approval before commit / push / deploy

---

## Deliverables

### 1. Bridge module

**File:** `client/src/components/landing/landingDesignSystem.ts`

Re-exports dashboard recipes for landing consumers:

| Export | Maps to |
| --- | --- |
| `landingDashCard` | `restaurantDash.card` |
| `landingDashSupporting` | `kpiCardSupporting` + hover glow |
| `landingDashIcon` / `Lg` | `iconContainer` / `iconContainerLg` |
| `landingDashHeroPanel` | `restaurantDash.hero` |
| `landingDashInset` | `itemRow` |
| `landingDashChip` | toolbar chip language |
| `landingDashStatusOk` / `Live` | emerald / cyan status pills |

Documents `data-accent` → ExecutivePeriodDashboard semantic mapping in file header.

### 2. Landing CSS rewrite

**File:** `client/src/index.css` (`.landing-page` block)

| Token / class | Change |
| --- | --- |
| `.landing-page` | Shell → slate-900 / slate-800 gradient (dashboard shell) |
| Accent CSS vars | Hex Tailwind palette matches (orange/sky/violet/green/cyan/teal) |
| `.landing-glass` | slate-900/72 + cyan-500/22 edge (shell header language) |
| `.landing-card` | `from-slate-800/50 to-slate-900/50` + cyan-500/30 border; hover = cyan glow |
| `[data-accent=*]` | Soft category shells mirroring Executive cards (not rainbow fills) |
| `.landing-accent-icon` | slate-900/60 + accent-tinted border (iconContainer weight) |
| `.landing-btn-primary` | primary fill + `shadow-cyan-500/*` (dashboard glow) |
| `.landing-btn-ghost` | toolbarBtn cyan border/hover |
| `.landing-trust-chip` | chip recipe from bridge |
| `.landing-secondary-row` | kpiCardSupporting weight |
| `.landing-nav-link` | slate-400 → cyan hover active |
| `.text-gradient-teal` | cyan-300 → cyan-400 → teal-400 (dashboard cyan family) |
| Motion | Existing keyframes retained; `prefers-reduced-motion` unchanged |

### 3. Component wiring

| File | Changes |
| --- | --- |
| `Home.tsx` | Bridge icons for secondary + how-it-works; slate/white hierarchy; cyan badge / borders / CTA glow |
| `HeroPreview.tsx` | `landingDashHeroPanel`, icon, inset, status pills; remove oklch chrome |
| `ProductJourney.tsx` | Cyan section borders; white/slate titles; accent icons retained via CSS |
| `LandingNavbar.tsx` | `border-cyan-500/20` on glass nav |

### 4. Category accent map (landing → dashboard)

| `data-accent` | Dashboard semantic | Affects |
| --- | --- | --- |
| `qr` | orders / orange | border, icon, hover glow |
| `ordering` / `tables` | sky | border, icon, hover |
| `kitchen` | violet | border, icon, hover |
| `payments` | emerald / cash | border, icon, hover |
| `analytics` / `mgmt` / `lang` | cyan info | border, icon, hover |
| `growth` | teal / net | border, icon, hover |

Accents remain quiet (soft gradients + low-opacity borders). Cards are not colorful slabs.

---

## Explicit non-changes

- Section order / layout grids / storytelling structure (Experience-1)
- Font families / type scale philosophy
- Brand name / logo / primary brand CTA color token (`bg-primary`)
- Content, claims, i18n strings
- Bundle: no new dependencies

---

## Verification checklist

- [ ] Landing → Dashboard visual continuity (slate + cyan panels)
- [ ] Feature / journey cards show category accents without rainbow noise
- [ ] Icon wells match dashboard weight
- [ ] Buttons: hover / active / focus-visible / cyan glow
- [ ] `prefers-reduced-motion` disables decorative animation + hover lifts
- [ ] No layout shift vs Experience-1 structure
- [ ] Lighthouse: expect neutral (CSS-only; no new JS)

---

## Related

- [AUDIT.md](./AUDIT.md)
- [FINAL-REPORT.md](./FINAL-REPORT.md)
