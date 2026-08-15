# PRICE AUTHORITY

New commercial commitment:

`resolveLivePlanById(planId)` + selected `billingCycleCode` → `pricingService.currentPriceForPlan(planId, billingCycleCode)` → snapshot amount/currency.

Fail closed if plan, cycle, amount, or currency is missing.

Never: `subscription_plans`, `legacyPlanId`, Binding `chargedAmount`, previous snapshot amount, provider amount, FX, hardcoded currency, monthly × 12 for yearly.

Admin UI still sends only Live Plan UUID + cycle (no manual amount).
