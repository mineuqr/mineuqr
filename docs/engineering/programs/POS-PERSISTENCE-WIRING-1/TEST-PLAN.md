# TEST PLAN

## Baseline

Run existing `server/pos` tests before treating implementation as complete. Predecessor POS folder: 133 passed.

## Targeted (this program)

1. Composition: `NODE_ENV=test` â†’ InMemory; production/development â†’ Drizzle
2. Terminal create/read/list/lifecycle + tenant list isolation
3. Unique code conflict mapping (`ER_DUP_ENTRY` â†’ `PosTerminalCodeConflictError`)
4. Register race re-read of winner
5. Grant lookup, upsert idempotence, revoke, restaurant/user isolation, unknown namespace drop
6. Idempotency create/lookup, tenant/terminal/user isolation
7. Duplicate same fingerprint: success, no overwrite
8. Duplicate different fingerprint: fail closed, no overwrite
9. `runExclusive` serializes same-process work
10. Fail closed when `getDb()` is null
11. Architecture: no 0094, unique indexes remain, no generic repository, Check/Settlement stay InMemory

## Regression

- POS Terminal domain / access / entitlement
- POS sale / Check intake / settlement
- POS register-shift / drawer movement / cashier CRMP
- POS architecture guards
- CRMP Register/Shift/Settlement + drawer API
- Order settle / staff counter pickup
- Check settlement integration + reporting parity

Do not rewrite unrelated failing tests. InMemory terminal insert uniqueness was **not** tightened, because existing lifecycle tests seed multiple ids with the same code; production uniqueness remains the MySQL index.
