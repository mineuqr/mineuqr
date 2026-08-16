# LONG-TERM QUALITY GATE

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

MineuQR is a long-term professional SaaS. Orphan-producing domain races are not acceptable because COUNT(*) still fits the cap.

## REQUIRED NOW

- Restaurant-row `FOR UPDATE` on deletion and on A-class child creates (category, item, POS provision/replace, order, admin catalog insert).
- Delete transactions READ COMMITTED so cascade DELETEs are current reads after a lock wait.
- Fail closed when the parent row is gone.

## REQUIRED FOUNDATION FOR FUTURE

- One domain primitive (`requireRestaurantRowForUpdate`) for every restaurant-owned INSERT that must not outlive the parent.
- Explicit lock order: occupancy mutex then parent row whenever both apply.
- New restaurant-owned tables (groups, integrations, extra catalog) call the same primitive in the persist txn — not a new lock product.

## SAFE TO DEFER

- Foreign keys / 0095.
- Wiring D-class inserts (offers, tables, holidays, POS grants, POS sale idempotency, CRMP/settlement) until those domains run their own lifecycle programs.
- Lock-wait tuning.
- G-09 / G-10 / G-11 policy.
- G-02 occupancy application deploy; G-03 git terminus.

## SHOULD NEVER BE INTRODUCED

- POS-specific lifecycle locks
- Global locks
- Application-memory locks
- Redis / distributed locks for local domain ownership
- Shadow orphan counters
- Commercial-owned restaurant lifecycle
- Hiding orphan rows from occupancy COUNT(*)
- Disabling deletes merely to avoid races

## Scale

| Shape | Behavior |
|-------|----------|
| Single restaurant | One parent row lock |
| Many restaurants | Unrelated PKs; tenant B not blocked (proven) |
| Many POS terminals | Still restaurant-scoped occupancy mutex + same parent row |
| Many cashiers | Serialized per restaurant (and per limitKey), not cluster-wide |
| Future branches | Each TiDB branch has its own rows; primitive is application-side |
| Restaurant groups | Do not reuse this row as a group lock; group needs its own authority |
| Future integrations | Adopt the primitive; do not add a second mutex table for ownership |
| Years of maintenance | Small surface: `restaurantRowLock.ts` + caller discipline |

Professional now: the G-08 gap is closed.  
Scalable later: same parent row, no premature lock bus.
