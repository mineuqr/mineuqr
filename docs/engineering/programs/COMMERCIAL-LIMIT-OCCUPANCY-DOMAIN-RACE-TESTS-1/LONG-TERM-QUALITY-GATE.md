# LONG-TERM QUALITY GATE

MineuQR is a long-term professional SaaS. G-08 required **no occupancy correction**, so there is no REQUIRED NOW patch to scale. The gate below is for the certified shared primitive plus documented gaps.

## Why nothing was required today

Domain creates that consume a slot already run inside `withCommercialLimitOccupancy`. TiDB races showed `COUNT(*) <= cap`. Deleting does not need a counter.

## How this scales across restaurants

Owner-scoped lock `(owner, userId, restaurants)` serializes that owner’s restaurant creates only.

## How this scales across terminals / cashiers

Restaurant-scoped lock `(restaurant, restaurantId, posTerminals)`. Cashiers are not occupancy actors. Replace stays `occupancyDelta=0`.

## Future branches

`branches` is vocabulary-only. If branches become quantity-governed, they must adopt the **same** helper and domain COUNT — not a POS lock and not a second counter.

## Future integrations

Any new quantity-bearing create must: hold the tenant lock → COUNT → `checkLimit` → insert → commit on one occupancy transaction. Do not COUNT then later create.

## Technical debt intentionally not taken

- No freeze-on-downgrade engine (G-11)
- No admin support-exceed productization (G-09)
- No parent-existence check inside occupancy (cascade TOCTOU)
- No catalog idempotency keys (G-12)

## Complexity avoided

No Redis, no reservation table, no occupancy ledger, no POS mutex, no global lock.

## Remain deferred

G-02 deploy occupancy application  
G-03 git / migration tail 0094  
G-09 admin quantity policy  
G-10 inactive occupancy product decision  
G-11 downgrade freeze  
Parent-exists-in-tx (only if product requires no orphans after tenant delete)

## Professional now / scalable later

The shared primitive is TiDB-proven (G-07) and domain-workflow-proven (G-08) for the cap invariant. Policy gaps stay policy. Orphan TOCTOU stays documented until an authorized architecture program.
