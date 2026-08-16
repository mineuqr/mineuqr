# CASCADE RACES

## G-05 (already certified)

`deleteRestaurantCascadeTx` deletes restaurant-scoped `pos_sale_idempotency`, `pos_permission_grants`, `pos_terminals`, then the restaurant. Occupancy COUNT is remaining domain rows. No FK from `pos_terminals` to `restaurants` (0091). StagIn has no `pos_terminals` table.

## TOCTOU proven (TiDB)

Category create looks up the parent, then occupies, then inserts. Restaurant DELETE does not take the occupancy lock.

Sequence:

1. Parent `SELECT` succeeds.
2. Occupancy create begins with delay inside INSERT.
3. Concurrent connection `DELETE FROM restaurants WHERE id = ?`.
4. Category INSERT commits.

Final: restaurant row gone, **1 orphan category** for that `restaurantId`. `architectureGap: true`.

No FK prevents the insert. Occupancy COUNT for that restaurantId is 1, but the tenant restaurant no longer exists. Live owners' restaurant/category caps were not exceeded.

## Why G-07 did not prevent this

The primitive serializes **one limit key** for **one scopeId**. It does not re-validate that the parent restaurant row still exists. Delete of a different table does not wait on that mutex.

## Why G-08 did not harden it

Phase 19 allows a shared fix only when `occupancy <= cap` is violated. This TOCTOU produces orphans, not cap overflow.

Phase 12 forbids a POS-specific workaround. A shared “parent still exists inside the occupancy tx” check would be a new architecture program, not a silent G-08 patch.

## Verdict

**CASCADE RESULT: ARCHITECTURE GAP CONFIRMED**  
**Class: D for occupancy invariant** (no cap break). Do not start a follow-on program from G-08.
