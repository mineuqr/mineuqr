# 02 — API CONSUMER MATRIX

Verified from source.

| Consumer | Current Identity (before OD-3) | Target Identity (after OD-3) |
|----------|-------------------------------|------------------------------|
| Public Pricing | integer via `legacyPlanId` | UUID `offering.planId` |
| Checkout PayPal/Tap | integer `z.number()` | UUID `livePlanUuidInput` |
| Admin create/update | integer | UUID |
| Customer Success | integer `parseInt` | UUID |
| Trial | UUID persist + integer 30002 fallback | UUID only; fail closed |
| PayPal metadata write | integer | UUID |
| PayPal metadata read | integer | UUID **or** leftover integer |
| Tap metadata write | integer | UUID |
| Tap metadata read | integer | UUID **or** leftover integer |
| Subscription API `listPlans` | integer `id` | UUID `id` (+ `planCode`, `catalogPlanId`) |
| Subscription DTO plan view | integer `id` on UUID path | UUID `id` |
| Commercial DTO `planId` | `string \| number \| null` | same type; Production values UUID |
| Bindings | UUID + `legacyPlanId` | UUID + `legacyPlanId` temporarily |
| `subscription.listPlans` client | **none** (guards forbid Pricing/CS use) | UUID if any future consumer |

No client used `subscription.listPlans`. Changing `id` to UUID does not break a live UI consumer.
