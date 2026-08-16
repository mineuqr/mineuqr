# IMPLEMENTATION PLAN

## Forensics (Phase 1)

Re-read before coding. Mapping to current code:

| Architecture item | Actual code |
|-------------------|-------------|
| `checkLimit()` | `server/subscription-runtime/enforcement.ts` — Live Plan cap; missing key deny; `null` cap = unlimited (existing) |
| Entitlement resolver | `resolveOwnerEntitlements` → Live Plan limits |
| Limit values | `commercial_limit_values` (plan composition). **Not locked.** |
| Provisioning | `subscriptionPlanLimits.ts` + `routers.ts`; POS `PosTerminalService` |
| Tx helper | Drizzle `db.transaction` (mysql2). Same connection for lock + COUNT + INSERT |
| Order BI lock | Sequence lock-row + deadlock retry. Occupancy **reuses the idea**, not the Order module |
| Schema / journal | Canonical SQL + `drizzle/meta/_journal.json`. Snapshots stopped at `0028`. Next tag **0094** |
| Test DB | Workspace `.env` points at Production TiDB. Occupancy concurrency **must not** use it |

## Chosen shape

```
withCommercialLimitOccupancy({
  scope,           // owner | restaurant + scopeId
  limitKey,        // restaurants | categories | items | posTerminals
  occupancyDelta,  // 1 consume, 0 serialize without +1
  decide,          // caller → checkLimit(proposedTotal)
  countOccupancy,  // caller COUNT on tx
  resolveExisting, // optional domain idempotency peek after lock
  create,          // caller domain insert on tx
  db?,             // tests inject isolated Drizzle; production getDb()
})
```

Vitest without injected `db` uses an unlocked check-then-act path so unit tests never open Production `DATABASE_URL`. Injected `db` always uses the locked path.

## Sequence

1. Additive migration `0094_commercial_limit_occupancy_locks`.  
2. Shared helper.  
3. Adopt restaurant / category / item create wrappers.  
4. POS slot-consuming provision consumes the same helper.  
5. Architecture guards.  
6. Isolated MySQL concurrency suite.  
7. Regression, build, check.  
8. Program docs. **No Production apply. No commit.**

## Adaptations vs architecture text

- Category/item `checkLimit` owner is **`restaurant.userId`**, not the actor id (correct tenant cap).  
- Optional `resolveExisting` after the lock so domain idempotency (POS same-code register) does not consume a slot.  
- Deadlock/lock-wait retry is local (errno 1213 / 1205, max 3). Does not import Order BI retry.
