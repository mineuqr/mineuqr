# BINDING OWNERSHIP

## Cardinality (Production)

`commercial_subscription_bindings.subscriptionId` is UNIQUE. INFORMATION_SCHEMA: no `restaurantId` on the binding table.

Cardinality: **0..1 Binding per `user_subscriptions` row**.

## Four questions

| # | Question | Answer |
|---|----------|--------|
| 1 | Mandatory for every qualifying subscription? | **No** as implemented. Four of six Production rows have no Binding. Entitlement still resolves from subscription + Live Plan. |
| 2 | Mandatory only after a payment/bind event? | **Historically yes** for checkout/webhook/trial bind writers. Admin create gained a bind call only on 2026-08-15 (`fe209565`). |
| 3 | Optional for entitlement? | **Yes.** `getCommercialEntitlements` / lifecycle entitlement do not require a Binding. Unbound 780001 is still `active` with a Live Plan UUID. |
| 4 | Required specifically for Admin-created commercial subscriptions? | **Required for financial completeness (I-ADMIN-CT-01), not for entitlement.** Current Admin create *attempts* bind and fail-softs. Invoice PDF *requires* `binding.chargedAmount`. MRR *requires* Charged Terms. |

## Do not collapse

```
Entitlement availability
  = account-level subscription lifecycle
    + canonical Live Plan identity
    + commercial entitlements resolver

Financial / MRR eligibility
  = COMMERCIAL population
    + countsInMrr
    + entitled canonical subscription
    + valid Charged Terms on Binding
```

Binding is the financial enrollment record. It is not the entitlement switch.

Admin-created INTERNAL rows (780001, 600001) can be entitled without ever being MRR-eligible.

## Production bind presence

| id | Admin-created? | Binding |
|----|----------------|---------|
| 600001 | unproven | no |
| 690001 | unproven (Admin-updated) | no |
| 750001 | yes (2026-06-16) | no |
| 780001 | yes (2026-06-21) | no |
| 810001 | yes (2026-08-15) | yes |
| 840001 | yes (2026-08-15) | yes |

Bind presence tracks **create time vs cutover**, not restaurant count.
