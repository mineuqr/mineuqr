# MRR / ARR

## Rules

| State | MRR |
|-------|-----|
| Current concession + no snapshot | 0 |
| Current concession + existing paid snapshot | 0 |
| Expired/cancelled concession + no snapshot | 0 |
| Expired/cancelled concession + existing paid snapshot | snapshot MRR |

ARR remains `MRR × 12` (`arrMethod: "MRR_X12"`). No special free-period ARR formula.

## Implementation

`loadChargedTermsForMrr` loads current-concession subscription ids and **excludes** them before reading snapshots.

`computeMrrFromChargedTerms(..., suppressedSubscriptionIds)` skips suppressed ids even if a snapshot map entry exists.

## Forbidden sources

- Current catalog price
- Binding leftover `chargedAmount`
- `$0` Charged Terms
- `subscription_plans` / `legacyPlanId`

After concession expiry, an existing current snapshot becomes effective again without rewriting it.
