# PLAN CHANGE ATOMICITY

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

## Tenant downgrade (rebind)

`bindSubscriptionToLivePlan` updates one binding row (`planId` + charged terms). Effective limits are **not copied onto the binding**. They resolve later via `loadBoundLivePlan(planId)` + live catalog limits.

Atomic unit: the binding write. After commit, the next `resolveOwnerEntitlements` (default: uncached) sees the new plan’s limits.

## Catalog limit edit

`saveLive` validates, writes plan/limit fields, persists, then invalidates public catalog + entitlement caches. In-memory rollback on validation/persist failure.

## Occupancy txn vs plan write

The occupancy mutex does **not** lock the binding or live-plan row. Plan change and resource create are separate transactions.

Accepted consistency boundary:

- `decide()` reads the cap observed at decide time.
- An in-flight create that already passed `decide()` under the old cap may insert after the new cap commits.
- Subsequent creates that `decide()` against the new cap are rejected.
- Worst case: occupancy may exceed the new cap by already-authorized in-flight creates. That is Policy B leftover occupancy, not a second cap system.

Redesigning bind + occupancy into one global transaction would couple catalog writes to every restaurant create. Not required; not done.

## Cache

`useCache` defaults **off**. When enabled, TTL is 5 seconds and identity includes owner + second. `saveLive` / `notifySubscriptionLifecycleChanged` invalidate. Default create path does not serve a stale cached cap.

## Fail-closed

Unreadable bound live plan → `denyEntitlementsFailClosed` → `plan NONE` → `checkLimit` deny. Missing limit key → deny. Invalid/missing cap does not become unlimited unless the key is present and the value is explicitly `null`.
