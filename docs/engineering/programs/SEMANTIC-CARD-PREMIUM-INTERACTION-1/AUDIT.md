# AUDIT — SEMANTIC-CARD-PREMIUM-INTERACTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE  
**Scope:** Presentation / interaction only — no layout, typography, or semantic color redesign  
**Do not commit / push / deploy**

---

## 1. Pre-state assessment

The Semantic Card Design System (unified via prior programs) delivered consistent chrome but felt **static** relative to Linear / Stripe / Vercel / Notion / Raycast:

| Dimension | Pre-state | Gap |
| --- | --- | --- |
| Lighting | Flat gradient + thin hover shadow | No ambient / edge / inset layers |
| Depth | `shadow-none` rest | Little physical surface cue |
| Hover | Border cyan + `shadow-sm` | No lift, no brightness, weak glow |
| Motion | `transition-all duration-200` | Linear ease; property thrash risk |
| Icons | Static color only | No micro-scale / glow response |
| Executive | Lift + scale `1.02` + simple color shadow | Glow shallow; scale slightly aggressive |
| Landing | Matches panel but thin hover | Weaker than target premium feel |
| States | Focus ring only | Pressed / selected / disabled incomplete |
| a11y | Partial `motion-safe` on executive | Hover/motion not fully reduced-motion gated |

---

## 2. Constraints (confirmed)

- Do **not** redesign layouts, spacing philosophy, typography, or semantic hex ownership
- Do **not** introduce heavy / flashy animation
- Prefer GPU properties: `transform`, `opacity`, `filter`, `box-shadow`
- Respect `prefers-reduced-motion`
- Keep bundle impact minimal (CSS + token strings only)

---

## 3. Interaction inventory (owners)

| Surface | Owner | Pre-interaction |
| --- | --- | --- |
| Panel base / hover | `tokens/panel.ts` | Static cyan panel |
| KPI | `SemanticKpiCard` | Shell hover only |
| Executive | `SemanticExecutiveCard` | Lift + ripple + category glow |
| Surface | `SemanticSurfaceCard` | Type recipe hover |
| Icons | `tokens/icon.ts` | Static wells |
| Category / domain glow | `category.ts` / `domain.ts` | Simple `hover:shadow-*-500/*` |
| Landing | `.landing-card` CSS | Thin border/shadow hover |

---

## 4. Design direction (approved intent)

Elevate **in place** via one interaction token module + shared `.semantic-card` lighting CSS so every facade consumer inherits premium feel without forking.

Target feel: soft physical surfaces, intelligent hover, spring-like easing, semantic glow richness without saturation increase.
