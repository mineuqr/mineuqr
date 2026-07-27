# Card Specification

## Card set (fixed)

| id | Category | Label EN | Decision role |
|----|----------|----------|---------------|
| `cashSales` | cash | Cash Sales | Cash drawer / tender mix |
| `cardSales` | card | Card Sales | Card / electronic tender mix |
| `refundPublishedTotal` | refund | Refund Amount | Leakage awareness |
| `taxCollected` | tax | Tax Collected | Compliance glance |
| `orderCount` | orders | Orders | Volume |
| `netRevenue` | net | Net Sales | Bottom-line for period |

## Visual anatomy

1. Category-tinted border + soft gradient shell  
2. Label (muted, small)  
3. Value (large tabular numerals)  
4. Caption (one-line business hint)  
5. Category icon (trailing)  

## Hierarchy

- Five category cards equal weight in the grid  
- **Net Sales** visually primary (emerald/teal family, wider span on `lg`)  

## Forbidden on operational cards

- Sparklines, badges, promo chips, continuous pulse  
- Average Order / Average Check / Refund Rate  
