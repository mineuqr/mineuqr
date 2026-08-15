# PRICE AND CURRENCY SOURCE

Admin create has **no amount input**. The commercial contract for a **new** Admin create is:

```
Current Live Plan Offer List Price
  + Admin-selected billing cycle
  + currency on that commercial_prices row
      → Charged Terms
```

Authority: `pricingService.currentPriceForPlan(planId, billingCycleCode)` (global row when Admin does not pass a region — same as checkout offer resolution).

Not used:

- `subscription_plans.priceMonthly` / `priceYearly`
- Admin UI display string
- leftover integer plan price
- retrospective reconstruction for old rows

Currency is **only** `price.currency` from that catalog row. Empty currency → `missing_currency` fail closed. This program does not invent USD/SAR, FX, or tax.

Amount missing, non-finite, or ≤ 0 → `missing_amount` fail closed.
