# 05 — CHARGED TERMS IMPACT

## Invariant

Historical Charged Terms are insert-only. Reactivation MUST NOT:

- UPDATE amount, currency, cycle, or `effectiveFrom` on an old row
- DELETE a snapshot
- replace a row in place
- treat Binding leftover as the offer

## Current implicit path

Status-only `status=active` **reuses** the latest snapshot as current financial authority the moment the row is entitled again. That is Model A in effect. **Rejected.**

Plan/cycle change already inserts Snapshot N+1 (`admin_update`). That write is financially closer to Model B but is not named or gated as Reactivation.

## Contract (Model B)

Paid Reactivation:

```
resolveLivePlanById(selectedPlan)
→ currentPriceForPlan(planId, selectedCycle)
→ reject amount <= 0
→ INSERT snapshot version N+1
     source = admin_reactivate (implementation name)
     effectiveFrom = now
     chargedAmount = current offer
→ then activate the same subscriptionId
```

If the current snapshot already matches the resolved offer **and** the row is already entitled: **idempotent reuse** of that current snapshot (no second insert). That is “already reactivated,” not continuation of a terminated commitment.

If the row is **not** entitled, a matching historical snapshot is **not** sufficient. A new snapshot is still required so `effectiveFrom` marks the new commitment. (Implementation may insert N+1 with the same amount. Same amount ≠ continuation.)

## No-snapshot rows

Paid Reactivation must create Snapshot #1. Success without a snapshot is forbidden.

Free Reactivation must not create a $0 snapshot.

## Binding

Binding `planId` may be updated to the selected Live Plan. Binding leftover charged columns are **not** financial authority. Do not read them back as the offer.
