# CONCURRENCY ANALYSIS

## Is `checkLimit` + create a safe occupancy operation?

**No.**

## Proof (not application-test-only)

1. `checkLimit` never sees the database occupancy; the caller passes `proposedTotal`.  
2. Caller COUNT and INSERT use the mysql2 **pool** — typically **two connections**, not one transaction.  
3. Even on **one** connection, `BEGIN; SELECT COUNT(*); INSERT; COMMIT` under TiDB/InnoDB snapshot reads allows both transactions to see the same count.  
4. There is no `FOR UPDATE` on a lockable occupancy token in any limited-create path.  
5. There is no unique constraint that encodes `COUNT <= cap`.

Therefore the architecture does **not** guarantee `final occupancy <= limit` under concurrent requests.

## Realistic trigger

Low-rate owner double-submit / two tabs / two support operators. Not order-volume. Still a commercial invariant break (over-provision).

## What uniqueness does and does not do

| Constraint | Serializes |
|------------|------------|
| POS `(restaurantId, code)` | same code only (idempotent winner) |
| POS grant unique | same grant |
| `users.email` | onboarding duplicate email |
| `commercial_limit_values (profileId, limitKey)` | catalog composition, **not** tenant occupancy |

## Cross-tenant

Restaurant A at cap does not block restaurant B: counts are scoped. The race is **intra-scope**, not cross-tenant leakage.

## POS

Same race as restaurants/categories/items. Fix must be shared Commercial consumption, not a POS lock.

## Classification

**COMMERCIAL LIMIT CONCURRENCY GAP** — real, non-blocking for current low-rate provisioning, **B. REQUIRED FOUNDATION FOR FUTURE**.
