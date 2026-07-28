# IMPLEMENTATION — SEMANTIC-VISUAL-INTENSITY-CALIBRATION-1

**Date:** 2026-07-28  
**Status:** COMPLETE — awaiting Architecture Authority approval  
**Do not commit / push / deploy**

---

## 1. Token / CSS calibration (~+30% light)

| Owner | Change |
| --- | --- |
| `tokens/panel.ts` | Base border `/30→/40`, fill `/50→/55`; supporting/inset/hero borders up |
| `tokens/interaction.ts` | Hover border `/60`, bloom ~0.38, brightness `1.05`; icon glow `0.62`; well glow stronger |
| `tokens/domain.ts` `SEMANTIC_DOMAIN_ACCENT` | Borders `/52–/58`, hover bloom ~0.38–0.42 |
| `tokens/category.ts` | Executive borders `/45–/50`, glow bloom ~0.40–0.48 |
| `index.css` `.semantic-card*` | Ambient ~0.16–0.24, rest opacity 0.92, clearer rim |
| `.landing-card` | Matched app intensity (border, ambient, hover) |
| Executive edge sheen | `via-white/40` |

---

## 2. Global domain adoption (remaining gaps)

- Commercial subscription health / needs-attention → `domain` per status  
- Security overview KPIs → analytics / information / warning  
- Admin StatisticsPanel → analytics / growth / revenue / information  

---

## 3. Constraints honored

No new design system · no new colors · no layout/spacing/typography change · no `transition-all` · GPU properties only · reduced-motion preserved.

---

## 4. Guards

`semanticVisualIntensityCalibration.architecture.guards.test.ts` — **4/4 PASS**  
With design-system + domain suites: **16/16 PASS**
