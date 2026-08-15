# SUBSCRIPTION-EXPIRY.md

## Paid expiry

```
ACTIVE  →  period end (no grace)  →  FROZEN
```

`syncCommercialLifecycle` already projects `period_ended` / `db_expired` / `db_canceled` / `signal_suspended` to `entitlementsEnabled: false`. Frozen stamps that as `FROZEN` when a canonical customer subscription exists.

## What this program does not do

- Modify historical subscription rows to create Frozen
- Extend subscriptions
- Create fake renewals
- Alter billing history
- Change Live Plan composition or prices
- Redesign Checkout

## Grace

If lifecycle signals keep `entitlementsEnabled: true` (grace), account state stays `ACTIVE`. Frozen does not override grace.
