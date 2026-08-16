# IMPLEMENTATION

**File:** `server/db/cascadeDeletes.ts` (plus tests/guards/docs).

Direct `tx.delete` of the three POS tables, restaurant-scoped, before the restaurant row. No POS service, no occupancy helper, no job, no migration.

`deleteUserCascadeTx` inherits the fix automatically.
