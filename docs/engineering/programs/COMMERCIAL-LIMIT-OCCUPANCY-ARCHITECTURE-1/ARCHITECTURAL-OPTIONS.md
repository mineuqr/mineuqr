# ARCHITECTURAL OPTIONS

## Problem

Cap is commercial. Occupancy is domain COUNT. They are not atomic.

## Options (see DATABASE-ANALYSIS for engine detail)

| ID | Name | Verdict |
|----|------|---------|
| A | Tx + `FOR UPDATE` | Necessary ingredient |
| B | Explicit occupancy counter | Avoid as first design (drift on delete/plan change) |
| C | Reservation-first | Defer; too heavy |
| D | OCC on occupancy row | Inferior to pessimistic lock at the cap hotspot |
| E | Unique constraint | Cannot encode quantity cap |
| F | Generalize BI lock-row + COUNT | **Adopt as the pattern** |
| G | Parent-row `FOR UPDATE` (no new table) | Valid no-DDL interim; not preferred long-term |
| — | `GET_LOCK` | Reject until TiDB cluster proof |
| — | Lock `commercial_limit_values` | **SHOULD NEVER** (cross-tenant plan lock) |
| — | POS-only lock | **SHOULD NEVER** |

## Recommended future shape (not built here)

```
db.transaction:
  1. Ensure tenant-scoped lock row (owner or restaurant + limitKey)
  2. SELECT lock row FOR UPDATE
  3. checkLimit(ownerId, limitKey, COUNT(domain)+1)   // cap still Commercial
  4. INSERT domain row
```

Helper owned by **subscription-runtime / commercial**, e.g. conceptual `withCommercialLimitSlot`. POS, restaurant, category, item **consume** it. They do not own locks.

Occupancy remains **COUNT(current rows)** (POS: provisioned lifecycle). No occupancy number column unless a future resource cannot be counted.

## Why not implement in this program

1. Dedicated lock table → **migration** → STOP (not authorized).  
2. Parent-row lock → still rewires every create path + needs **real TiDB** concurrency tests. This environment does not certify occupancy from in-memory mocks.  
3. Next program in the chain is POS read APIs, not occupancy implementation.

## Quality vs options

Professional SaaS today: document the invariant and the primitive; do not ship a POS workaround or an untested GET_LOCK.

Scale: lock granularity = (tenant scope, limitKey). Restaurant A does not block B. Different limit keys on the same restaurant may share the restaurant lock (acceptable; provisioning is rare) or use per-key lock rows (preferred table).

Future capabilities: new `limitKey` + count query in the same helper.
