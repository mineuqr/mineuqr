# DATA-MIGRATION-PLAN

**Not executed.**

## If AA later approves UUID-on-subscription

```
user_subscriptions.planId (int)
        ↓
LEGACY_PLAN_BRIDGE / PLAN_ID_TO_CATALOG_PLAN (code)
        ↓
commercial_plans.id WHERE code = mapped code
```

Deterministic **only** for 30001/30002/30003 with exactly one Live Plan per code.

Unmapped integers → **STOP**, do not guess, do not map by price or name.

Charged Terms columns must not be updated.

## Production verification required before any DML

Re-read `user_subscriptions.planId` distinct values and `commercial_plans (id, code)`.  
This session did not run production SQL.

Historical (2026-08-14): 5 test/internal rows, 30002×4 + 30003×1, 0 paid invoices.
