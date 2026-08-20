# PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1 — Implementation Report

**Status: IMPLEMENTED / VALIDATED / NOT ADOPTED**

Contract module `productionCollectionFactCommitContract.ts` was **not** redefined.

---

## What was missing (before this program)

- Writer/store did not freeze committed facts (in-process mutation possible).
- Replay did not assert `store.insert` was called once.
- `DUPLICATE` recovery after a successful persist was untested.
- `STORAGE` abort was untested.
- Fingerprint CONFLICT was not proven per financial field on the writer path.
- Complete production snapshot (all required frozen fields) was only partially asserted.
- Repository SQL guards did not explicitly forbid `update`/`delete`/`onDuplicateKeyUpdate` on `paymentCollectionFacts`.

---

## What was hardened

1. `collectionFactImmutability.ts` — `freezeCollectionFact` (structured clone + deep freeze).
2. `commitCollectionFact` freezes the fact before `store.insert`.
3. `InMemoryCollectionFactStore.insert` stores/returns the frozen clone.
4. `insertCollectionFact` returns a frozen fact after drizzle INSERT (still insert-only; no UPDATE SQL).

---

## Tests added (not duplicated blindly)

New file `productionCollectionFactCommitExecution.test.ts` (11 tests) covers the execution matrix gaps: complete snapshot, insert-count replay, DUPLICATE-after-persist, STORAGE abort, fingerprint field matrix, intent conflict, non-collapsing different intent, runtime freeze, downstream non-mutation, created/replayed one insert, optional checkId + composition origin guard on the writer.

New architecture guards: Confirm/Cashier still do not call writer; Settlement does not own facts; no 0098; reporting adapter read-only; no Collection Fact UPDATE SQL.

**Reused unchanged:** contract validator tests (12), prior production writer tests (11), `CollectionFactService.test.ts` (13, including concurrent same-intent serialization), prior CF architecture guards.

**Existing tests modified:** none.

---

## Files

### Modified

- `server/operational-session/payment/collection-fact/CollectionFactService.ts`
- `server/operational-session/payment/collection-fact/InMemoryCollectionFactStore.ts`
- `server/operational-session/payment/collection-fact/collectionFactRepository.ts`

### Added

- `server/operational-session/payment/collection-fact/collectionFactImmutability.ts`
- `server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommitExecution.test.ts`
- `server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommitExecution.architecture.guards.test.ts`
- `docs/engineering/programs/PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1/*`

---

## Runtime / production impact

Live Confirm/Cashier/Settlement paths unchanged (they still do not call the writer).

Dormant writer now returns frozen facts. Isolated-purpose commits also freeze (same insert path). That is immutability hardening, not a contract change.

No production INSERT/UPDATE/DELETE. No migration. No deploy.
