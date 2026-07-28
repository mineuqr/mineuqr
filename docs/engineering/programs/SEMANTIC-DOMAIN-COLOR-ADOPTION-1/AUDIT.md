# AUDIT — SEMANTIC-DOMAIN-COLOR-ADOPTION-1

**Date:** 2026-07-28  
**Status:** COMPLETE  
**Do not commit / push / deploy**

---

## 1. Pre-state gap

| Layer | Domain chrome |
| --- | --- |
| Landing | `data-accent` → full domain shells (reference) |
| Executive KPI | Category surfaces (cash/card/refund/tax/orders/net) — already rich |
| App `SemanticKpiCard` | **Tone → icon only**; shell always neutral slate |
| `SemanticSurfaceCard` | Had `domain` API — **zero app call sites** |
| Register CashDrawer | Already `domain: "payments"` |
| Kitchen / Ops / Fleet tickets | Neutral `SEMANTIC_PANEL_BASE` only |

---

## 2. Canonical domain identities (aligned)

| Domain | Identity | Hex SSOT |
| --- | --- | --- |
| QR | Amber | `#fbbf24` |
| Orders | Sky | `#38bdf8` |
| Kitchen | Violet | `#a78bfa` |
| Payments | Emerald | `#34d399` |
| Revenue | Emerald executive | `#34d399` |
| Analytics / Sessions | Cyan | `#22d3ee` |
| Growth | Teal | `#2dd4bf` |
| Information | Blue/Sky | `#38bdf8` |
| Success | Green | `#4ade80` |
| Warning | Amber | `#fbbf24` |
| Danger | Red | `#f87171` |

Sessions map to **analytics** (cyan) — no duplicate token.

---

## 3. Mapping — neutral → domain (executed)

| Surface | Pre | Adopted domain |
| --- | --- | --- |
| OperationalSnapshot preparing | neutral | `kitchen` |
| Settlement averageCheck | neutral | `revenue` |
| Sessions / ops / tables KPIs | tone-only | `analytics` / `orders` / `revenue` |
| Orders details / workspace | tone-only | `orders` / `kitchen` / `revenue` |
| Dining session summary | tone-only | `analytics` / `orders` / `revenue` |
| Payments / refunds / trends | tone-only | `payments` / `revenue` / `danger` / `warning` |
| Sales channels | accent-only | `growth` |
| Tax KPI | accent-only | `kitchen` (violet / tax family) |
| Fleet KPIs + card | neutral panel | `analytics` + status |
| Kitchen / Ops / Board tickets | neutral panel | soft `kitchen` / `orders` accent |
| Admin / commercial MRR·ARR | tone-only | `growth` / `revenue` / `analytics` |
| Print status cards | no domain | `information` |
| Dashboard home stats | tone-only | `analytics` |
| Landing QR CSS | orange | **amber** (SSOT sync) |

---

## 4. Controlled-area rule

Semantic color may affect only:

- border · border/hover glow · ambient radial (`data-domain`) · icon · executive accents

**Never** flood KPI body fill. Soft accents use `SEMANTIC_DOMAIN_ACCENT` (not full `SEMANTIC_DOMAIN_SURFACE` shells) on KPI/tickets.
