# WEBHOOK-CLEANUP

Settlement, capture, currency, FX, tax, refund, and idempotency were **not** changed.

## PayPal

| Before | After |
|--------|-------|
| `getSubscriptionPlanById` existence | `isKnownLegacyPlanId` (bridge) |
| Email `plan.nameAr` | `resolveLivePlanDisplayByLegacyId` |
| Email amount fallback to `priceMonthly` | Provider `purchase_units.amount` or “غير محدد” |

Activation still writes the integer `planId` from `custom_id` (identity). Bind still uses `legacyPlanId`.

## Tap

Email plan name only → Live Plan display. Charge amount remains the provider fact.
