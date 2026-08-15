# WEBHOOK-IDENTITY-ASSESSMENT

| Provider field | Class | Action |
|----------------|-------|--------|
| PayPal `custom_id.planId` | B (our integer echoed) | Keep until checkout API changes |
| PayPal order / capture id | F | Keep |
| Tap `metadata.plan_id` | B | Keep until checkout changes |
| Tap charge id | F | Keep |
| `ensureLivePlanBoundForSubscription({ legacyPlanId })` | B | Resolves Live Plan via bridge; does not use table price |

Webhooks do **not** require `subscription_plans.id` after residual cleanup. They require the **same integer the checkout sent**.

No settlement/amount/currency/idempotency change in this program.
