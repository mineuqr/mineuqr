# FORENSIC AUDIT

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  
**Engine:** 8.0.11-TiDB-v8.5.3-serverless (`mineuqr-stagIn`)  
**Provenance:** G-08 P12 + this program’s code inspection. Not guessed.

## 1. Restaurant deletion entry points

| Entry | Path | Transaction |
|-------|------|-------------|
| Owner `restaurant.delete` | `server/routers.ts` → `deleteRestaurantCascade` | One RC txn |
| Admin `admin.deleteUser` | `deleteUserCascade` → `deleteRestaurantCascadeTx` per owned restaurant | One RC txn for the user |
| Shared cascade | `deleteRestaurantCascadeTx` | Called inside those txns |
| Direct service | None besides `cascadeDeletes.ts` | — |
| Background / system | None found | — |
| Test harness | `deleteRestaurantLockedCascade` in `occupancyG08Tidb.ts` | RC; stagIn subset (no `pos_terminals`) |

`deleteRestaurantCascade` / `deleteUserCascade` now start `{ isolationLevel: "read committed" }`.

## 2. Why DELETE restaurant ∥ CREATE category produced an orphan

G-08 P12 on the same TiDB branch, **before** this program:

1. Category create called `getRestaurantById` **outside** the occupancy transaction.
2. Restaurant delete did **not** `SELECT … FOR UPDATE` the parent row.
3. `information_schema.KEY_COLUMN_USAGE` referencing `restaurants` = **0**. No FK.
4. Occupancy INSERT ran on a **different connection** from DELETE.
5. G-08 originally used `DELETE FROM restaurants` without child cascade, which made the orphan obvious. Production `deleteRestaurantCascadeTx` (children then parent) without a parent lock can still orphan: a child INSERT can land after children are deleted and before the parent row is deleted, or after the parent is gone.

Final G-08 state: restaurant absent, category present (`orphanCategories=1`, `architectureGap=true`). Live-tenant `occupancy <= cap` still held. This is domain ownership, not Commercial serialization failure.

## 3. Causal class

| Candidate | Verdict |
|-----------|---------|
| Missing parent lock | **Yes** — delete and create did not share a row lock |
| Snapshot isolation | **Contributing on delete** — session default is REPEATABLE-READ; cascade child DELETEs after a lock wait must be current reads (hence RC on delete) |
| Parent existence check outside transaction | **Yes** — `getRestaurantById` is not a commit-time check |
| Separate transaction boundaries | **Yes** — occupancy txn ≠ delete txn |
| Missing foreign key | **Yes, enabling** — not the chosen fix |
| Delete ordering | Children-then-parent is correct; without parent lock it is not sufficient |
| Application-level TOCTOU | **Yes** — the composition of the above |
| Occupancy mutex failure | **No** — G-07 still serializes COUNT |

## 4. Quantity create path (before)

```
getRestaurantById          # not locked
  → occupancy mutex (G-07)
  → COUNT(*)
  → INSERT child
  → COMMIT
```

Delete:

```
BEGIN
  → DELETE children
  → DELETE restaurant
  → COMMIT
```

No shared serialization point.

## 5. Quantity create path (after)

```
getRestaurantById          # presentation / RBAC only
  → occupancy mutex (G-07, unchanged)
  → SELECT restaurants … FOR UPDATE
  → if missing: RestaurantGoneError (rollback)
  → COUNT(*) / checkLimit
  → INSERT child
  → COMMIT
```

Delete:

```
BEGIN READ COMMITTED
  → SELECT restaurants … FOR UPDATE
  → DELETE children (current reads)
  → DELETE restaurant
  → COMMIT
```

## 6. TiDB behavior used

- Pessimistic transactions.
- Session isolation REPEATABLE-READ; occupancy and delete transactions override to READ COMMITTED.
- `SELECT … FOR UPDATE` on an existing committed restaurant row waits; after the waiter proceeds, RC sees the current parent (or absence) and current children.
- G-07 already proved: `FOR UPDATE` locks the latest **committed** version; RR snapshot COUNT/DELETE after a wait can miss rows committed during the wait.

## 7. What this is not

Not a G-07 occupancy bug. Not a `checkLimit` bug. Not a 0094 bug. Commercial still only answers “is there capacity?”
