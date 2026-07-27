# Navigation Specification

## Product navigation (shipped)

| Order | Tab id | EN | AR | Purpose |
|------:|--------|----|----|---------|
| 1 | `today` | Today | اليوم | Immediate operational awareness |
| 2 | `month` | This Month | هذا الشهر | Same awareness, monthly |
| 3 | `financial` | Financial Analytics | التحليلات المالية | Business analysis + exports |

## Interaction

- `role="tablist"` / `role="tab"` / `aria-selected`  
- Active: high-contrast filled chip  
- Inactive: muted, hover elevates  
- Default landing: **Today**  

## Mapping to UX-06 (constitution — not amended)

Constitution UX-06 lists four canonical areas: Executive Overview · Sales Analytics · Financial Analytics · Exports.

| UX-06 area | Product mapping |
|------------|-----------------|
| Executive Overview | Today + This Month operational grids |
| Sales Analytics | Folded into Financial Analytics (Sales Trend + Sales Source) |
| Financial Analytics | Financial Analytics tab |
| Exports | Nested under Financial Analytics |

**Observation:** Product nav is a **three-tab presentation overlay** (Today · This Month · Financial Analytics). Constitution text is unchanged pending Architecture Authority amendment if permanent. Production docs: REPORTING-PRODUCT-UX-RESTRUCTURE-2.

## Forbidden

- Fourth top-level product tab  
- Nested technical IA (aggregates, settlement records, DTO names) in tab labels  
