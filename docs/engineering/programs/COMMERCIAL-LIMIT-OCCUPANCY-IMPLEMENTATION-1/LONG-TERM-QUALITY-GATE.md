# LONG-TERM QUALITY GATE

## Why it is correct today

Cap stays `checkLimit`. Occupancy stays domain `COUNT(*)`. Concurrent creates for the same tenant+limit serialize on one lock row inside the same transaction as COUNT+INSERT. Fail closed on deny, missing DB, or thrown create.

## Why it scales across restaurants

Restaurant-scoped keys lock `(restaurant, restaurantId, limitKey)`. Unrelated restaurants do not share a row.

## Why it scales across branches

No `branches` quantity occupancy exists yet. When it does, add a scope + `limitKey` + COUNT adapter. Do not overload `posTerminals` or `devices`.

## Why it scales across resource types

One helper. Each resource supplies count + create. Future quantity add-ons reuse the same primitive.

## Why it scales under concurrency

Hotspot is provisioning, not sales. Only same-tenant same-limitKey creates queue. Cross-tenant concurrent creates proceed in parallel (proven).

## How POS benefits

POS terminals consume the shared helper. No POS lock table. Same-code register remains idempotent under the lock via `resolveExisting`.

## How future limits reuse it

New `limitKey` + scope + COUNT of the domain table. Do not add a second limiter.

## Technical debt introduced

- Unlocked Vitest path (necessary so tests do not hit Production).  
- `PosTerminalService` constructor still takes unused `PosEntitlementService` for composition.  
- Onboarding first restaurant still outside occupancy.  
- Platform admin still skips category/item occupancy.  
- Concurrency proven on MySQL 8, not live TiDB.

## Complexity intentionally avoided

Reservations, occupancy counters, `GET_LOCK`, POS-specific locks, locking `commercial_limit_values`, global locks, Commercial-owned domain inserts, custom retry beyond deadlock/lock-wait.

## Deferred

Production apply of 0094; live TiDB race drill; quantity for orphan keys; downgrade freeze; restaurant/category/item create idempotency keys.

## Classification

| Item | Class |
|------|-------|
| Shared occupancy helper + tenant lock + FOR UPDATE | **A. REQUIRED NOW** (this program) |
| Adopt restaurants / categories / items / POS | **A. REQUIRED NOW** |
| Isolated real-DB concurrency suite | **A. REQUIRED NOW** |
| Production apply 0094 | **B. REQUIRED FOUNDATION FOR FUTURE** |
| Live TiDB occupancy drill | **B** (Apply program) |
| Onboarding first restaurant occupancy | **C. SAFE TO DEFER** (0→1 new user) |
| Quantity for `staffAccounts` / `branches` / `devices` | **C** |
| Downgrade freeze / excess deactivation | **C** (product policy) |
| Restaurant/category/item idempotency keys | **C** |
| Explicit occupancy counters | **D. SHOULD NEVER** as source of truth |
| POS-specific commercial lock | **D** |
| Lock `commercial_limit_values` / Live Plan for occupancy | **D** |
| Global occupancy lock | **D** |
| Treat bare transaction as serialization | **D** |
| Second commercial / limit system | **D** |
