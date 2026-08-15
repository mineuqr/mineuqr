# 09 — SCHEMA MIGRATION DESIGN

## Proposed later migration (NOT CREATED, NOT APPLIED)

Do **not** add `0089` to the repo until Architecture Authority authorizes apply.

Intended operation (design only):

```
PRECONDITION: every commercial_subscription_bindings.planId is a valid
              commercial_plans.id UUID
PRECONDITION: disagreement with user_subscriptions.planId = 0
THEN: ALTER TABLE commercial_subscription_bindings DROP COLUMN leftover integer column
PRESERVE: id, subscriptionId, planId, chargedAmount, chargedCurrency,
          billingCycleId, billingCycleCode, timestamps
```

Fail closed if any binding `planId` is not a UUID or is orphaned.

Do not combine with `subscription_plans` DROP.

Do not edit 0088.

## This program

No migration file. No journal entry. No Production DDL.
