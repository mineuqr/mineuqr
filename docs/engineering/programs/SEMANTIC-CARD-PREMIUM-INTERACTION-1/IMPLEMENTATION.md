# IMPLEMENTATION — SEMANTIC-CARD-PREMIUM-INTERACTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE — awaiting Architecture Authority approval  
**Do not commit / push / deploy**

---

## 1. Architecture

Extend `design-system/semantic-card` — no second interaction system.

| Artifact | Role |
| --- | --- |
| `tokens/interaction.ts` | Premium motion, hover, pressed, selected, disabled, focus, icon/value reactions |
| `tokens/panel.ts` | Aliases `SEMANTIC_HOVER_GLOW` / `SEMANTIC_MOTION` → premium; opts into `.semantic-card` |
| `index.css` `.semantic-card*` | Layered ambient + edge illumination (GPU-friendly) |
| Component wiring | KPI / Executive / Surface / icon wells |
| Category / domain `glow` | Richer layered shadows, same hue families |

---

## 2. Lighting

`.semantic-card` receives:

1. **Rest depth** — inset top highlight + soft ambient drop
2. **`::before` ambient** — soft radial wash from top (cyan; amber for primary KPI; category-tinted for executive)
3. **`::after` edge** — subtle inner rim; brightens on hover/focus
4. **Hover glow** — layered inset + cyan ring + soft outer bloom + slight brightness

Landing `.landing-card` mirrored the same language (ambient `::before`, edge `::after` for accents).

---

## 3. Depth & hover

| Token | Behavior |
| --- | --- |
| `SEMANTIC_HOVER_PREMIUM` | `translateY(-2px)`, richer border, layered shadow, `brightness(1.035)` |
| `SEMANTIC_EXECUTIVE_HOVER` | `translateY(-4px)`, `scale(1.015)` (was 1.02), pressed micro-compress |
| `SEMANTIC_PRESSED` | `scale(0.985)` + slight dim |
| `SEMANTIC_SELECTED` | Stronger cyan edge illumination |

All motion gated with `motion-safe:`.

---

## 4. Motion language

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` (spring-like, not bouncy)
- Duration: `300ms`
- Property allowlist: `transform, opacity, box-shadow, border-color, filter, background-color, color`
- **Removed** `transition-all` from premium motion path

---

## 5. Icon & KPI experience

- KPI / executive icons: `SEMANTIC_ICON_HOVER` (micro scale + cyan drop-shadow)
- Icon wells: `SEMANTIC_ICON_WELL_HOVER` (scale, border, well glow on `group-hover`)
- Values: `SEMANTIC_VALUE_HOVER` (subtle brightness on group hover)
- Primary KPI class `semantic-card-kpi-primary` — warm amber ambient

---

## 6. Interaction states (unified)

| State | Implementation |
| --- | --- |
| Hover | Premium lift + glow |
| Focus | `SEMANTIC_FOCUS_PREMIUM` cyan ring |
| Pressed | `SEMANTIC_PRESSED` |
| Selected | `data-selected` + `SEMANTIC_SELECTED` |
| Disabled | opacity + saturate mute |
| Loading | existing Skeleton (unchanged API) |
| Empty | existing SemanticEmptyState |

---

## 7. Accessibility

- `motion-safe:` Tailwind variants on transforms / scales
- `@media (prefers-reduced-motion: reduce)` disables transform/filter on `.semantic-card` / `.landing-card`; keeps border/shadow feedback
- Focus rings preserved for keyboard users
- Contrast / semantic colors unchanged

---

## 8. Performance

- No new JS animation libraries
- No layout-triggering transitions (width/height/padding)
- CSS pseudo lighting shared via one class
- Bundle: ~1 small TS module + CSS rules; facades alias existing exports

---

## 9. Guards

`semanticCardPremiumInteraction.architecture.guards.test.ts` — **5/5 PASS**  
Combined with design-system + unification suites: **18/18 PASS**
