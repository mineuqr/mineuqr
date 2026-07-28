# Semantic Token Registry — SEMANTIC-CARD-DESIGN-SYSTEM-1

**Date:** 2026-07-28  
**Rule:** Every token has exactly one owner. Facades re-export; they do not redefine.

---

## Panel tokens

| Token | Owner | Value (summary) |
| --- | --- | --- |
| `SEMANTIC_PANEL_BASE` | `tokens/panel.ts` | cyan-500/30 border + slate-800/900 gradient |
| `SEMANTIC_HOVER_GLOW` | `tokens/panel.ts` | cyan hover border + shadow |
| `SEMANTIC_MOTION` | `tokens/panel.ts` | `transition-all duration-200` |
| `SEMANTIC_SHELL` | `tokens/panel.ts` | slate-900/800/900 shell |
| `semanticPanel.focusRing` | `tokens/panel.ts` | cyan focus ring |

---

## Semantic tones

| Token | Owner | Color family |
| --- | --- | --- |
| `neutral` | `tokens/semanticTone.ts` | slate |
| `info` | `tokens/semanticTone.ts` | cyan |
| `success` | `tokens/semanticTone.ts` | green |
| `warning` | `tokens/semanticTone.ts` | orange |
| `danger` | `tokens/semanticTone.ts` | red |
| `accent` | `tokens/semanticTone.ts` | violet |

Surfaces per tone: `icon`, `row`, `badge`, `value`.

**Facades:** `restaurantSemantic`, `adminSemantic` (card accents / icons)

---

## Executive categories

| Category | Hex owner | Surface owner | Semantic meaning (presentation) |
| --- | --- | --- | --- |
| `cash` | `#34d399` | emerald shell | Cash / payments success family |
| `card` | `#38bdf8` | sky shell | Card tenders |
| `refund` | `#fb7185` | rose shell | Refunds |
| `tax` | `#a78bfa` | violet shell | Tax |
| `orders` | `#fb923c` | orange shell | Order volume |
| `net` | `#2dd4bf` | teal shell | Net / growth emphasis |
| `neutral` | `#94a3b8` | cyan/slate | Charts fallback |

**Facade:** `REPORTING_CATEGORY_HEX` → `SEMANTIC_CATEGORY_HEX`

**Removed private duplicate:** `CATEGORY_STYLE` in `ExecutivePeriodDashboard.tsx` (deleted; now `SEMANTIC_CATEGORY_SURFACE`)

---

## Value typography

| Token | Owner | Use |
| --- | --- | --- |
| `SEMANTIC_VALUE.operational` | `tokens/value.ts` | White operational figures |
| `SEMANTIC_VALUE.revenue` | `tokens/value.ts` | Amber–orange revenue |
| `SEMANTIC_VALUE.revenuePrimary` | `tokens/value.ts` | Large primary revenue |

**Facades:** `restaurantRevenueValueClass*`

---

## Data tokens (NOT owned by Design System)

| Concern | Owner |
| --- | --- |
| KPI IDs / formulas | `kpiDictionary.ts` |
| Preferred labels | `productSemantics.ts` |
| Executive visual tier enum | `productSemantics.EXECUTIVE_CARD_VISUAL_TIER` |
| Ordering channels | Ordering Channel Registry |
| Payment methods | Settlement / operational-session canonicalization |
| Tax | Business Tax Policy |
| Currency | Financial Platform |

Design System consumes **already-resolved** labels and values only.
