# Placeholder Validation Report

| Surface | Before | After |
|---------|--------|-------|
| Sales Source (4 cards) | Always “—” + “appears when available” | Single empty state when `facts=null` (no false cards) |
| Sales Source (future) | N/A | Cards render amounts **only** when facts provided |
| Tax Collected | Real DTO | Unchanged |
| Sales Before/After Tax | Two “—” KPI cards | Removed as fake KPIs; footnote until tax-base contract exists |
| Period empty dashboards | Premium empty (R2) | Unchanged |

## Rule enforced

Placeholders only when the reporting source truly has no publishable fact — never when activity exists but UI failed to bind.
