# INVARIANTS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Pre-downgrade

For a new capacity-consuming mutation: resulting occupancy ≤ old cap.

## Post-downgrade

Existing occupancy **may exceed** the new cap. That is Policy B, not a create bug.

Do **not** claim `occupancy <= cap` as an absolute post-downgrade invariant.

## New capacity

```
occupancyDelta = 1
proposedTotal = COUNT(*) + 1
proposedTotal <= effectiveCap
```

or the mutation does not persist.

## Non-increasing

```
occupancyDelta = 0
```

does not consume a slot. Hard `limit_exceeded` on `proposedTotal === occupancy` is not a create denial. Entitlement deny still fails closed.

## G-10

Catalog/location: every persisted non-deleted row occupies.  
POS: only provisioned lifecycles occupy.

## Ownership

Cap = Commercial `checkLimit`. Occupancy = domain COUNT. No shadow counter. No downgrade debt. No global occupancy.

## Isolation

Tenant A leftover occupancy does not consume tenant B slots.

## Fail-closed

Unresolved / NONE / unsupported limit does not become unlimited.
