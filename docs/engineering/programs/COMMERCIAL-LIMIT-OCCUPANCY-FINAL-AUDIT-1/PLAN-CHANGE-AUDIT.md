# PLAN CHANGE AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

## Ownership

Commercial: `bindSubscriptionToLivePlan`, `saveLive`, `resolveOwnerEntitlements` → `checkLimit`. POS / orders / reporting do not own caps.

## Atomicity

Binding upsert is one write. Limits resolve from the live plan on read. Occupancy txn does not lock the plan row.

Cache: `useCache` default off. `saveLive` / `notifySubscriptionLifecycleChanged` invalidate.

## PLAN DOWNGRADE ∥ CREATE

A create **can** observe the old cap if `decide()` ran before the new cap committed.

**A — legitimate consistency boundary**, not **B — permanent policy violation**.

Committed final state:

- Occupancy never exceeds the **old** cap (create-time invariant).
- Occupancy **may** exceed the **new** cap (G-11 Policy B leftover, or an in-flight create that already decided).
- The **next** create `decide()`s against the new cap and is rejected.

G-08 P10: occupancy 1, newCap 0, create rejected, `occupancyMayExceedNewCap: true`.  
G-11 sequential: create-then-downgrade occupancy 2 > cap 1; further create rejected.  
G-11 overlap this run: occupancy 1, create rejected.

Expiration / FROZEN is a distinct state. Not merged with downgrade.
