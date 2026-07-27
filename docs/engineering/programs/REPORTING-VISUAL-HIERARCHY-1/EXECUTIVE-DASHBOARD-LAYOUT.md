# Executive Dashboard Layout

| Field | Value |
|-------|-------|
| **Program** | REPORTING-VISUAL-HIERARCHY-1 |
| **Date** | 2026-07-27 |

## Decision bands (top → bottom)

| Band | Business question | Cards | Tier |
|------|-------------------|-------|------|
| Sold | How much did I sell? | Total Sales | Primary |
| Orders | How much order activity? | Orders, Sales Orders | Secondary |
| Refunds | How much was refunded? | Refund Amount | Secondary |
| Collection | Tax & payments | Tax Collected, Payment Overview | Supporting |

## Constitutional note

Mission step “What is my net result?” is answered in **Financial Analytics** via the Sales → Refund → Net strip. Net Sales remains Class 3 / off Executive (KPI-08/09).

## Layout tokens

- Primary: full-width hero card  
- Secondary: 1–2 column grid  
- Supporting: denser 2-column grid, lighter chrome  
