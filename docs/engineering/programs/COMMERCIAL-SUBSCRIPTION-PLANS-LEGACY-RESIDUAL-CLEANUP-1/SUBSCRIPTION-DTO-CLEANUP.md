# SUBSCRIPTION-DTO-CLEANUP

## `subscription.getCurrentSubscription` / `getByRestaurant`

| Field | Owner |
|-------|-------|
| `subscription.*` | Subscription lifecycle |
| `plan.nameEn` / `nameAr` | Live Plan |
| `plan.priceMonthly` / `priceYearly` | Live Plan **current catalog** (when catalog available); otherwise null — not Charged Terms |
| `plan.max*` | Live Plan limits |
| Charged amount | Not on this DTO (Charged Terms) |

Unresolved integer id → `plan: null` (explicit). No table fallback.

`listPlans`: Live Plan compatibility shape only. Missing catalog → `[]`.
