# Smart Drill-down Specification

## Principle

Cards are **navigation entry points**, not dead ends. Drill uses existing Financial Analytics sections — no duplicated screens, calculations, or APIs.

## Map

| Card | Focus | Section id |
|------|-------|------------|
| Cash Sales | `payment-cash` | `reporting-fin-payment` (cash rows highlighted) |
| Card Sales | `payment-card` | `reporting-fin-payment` (card rows highlighted) |
| Refund Amount | `refunds` | `reporting-fin-refunds` |
| Tax Collected | `tax` | `reporting-fin-tax` |
| Orders | `orders` | `reporting-fin-orders` (Orders Details) |
| Net Sales | `sales-trend` | `reporting-fin-sales-trend` |

## Behavior

1. Switch product tab → Financial Analytics  
2. Set focus state  
3. Smooth scroll to section  
4. Emphasize section ring + payment row tint when applicable  
5. Breadcrumb shows focus label  

## Implementation

`client/src/lib/reporting-exports/executiveDrillDown.ts`
