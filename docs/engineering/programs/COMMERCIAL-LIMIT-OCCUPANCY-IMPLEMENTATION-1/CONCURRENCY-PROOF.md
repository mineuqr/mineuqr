# CONCURRENCY PROOF

## Environment

| Fact | Value |
|------|--------|
| Engine | Isolated Docker **MySQL 8.0** (`mineuqr-occupancy-test`, host port **3307**, database `occupancy_test`) |
| Production TiDB | **not used** (workspace `.env` `DATABASE_URL` is Production; occupancy tests never read it) |
| Driver | mysql2 pool + Drizzle `db.transaction` |
| Proof file | `server/subscription-runtime/__tests__/commercialLimitOccupancy.concurrency.test.ts` |

Unlocked Vitest path is **not** this proof.

## Required scenarios

| Scenario | Result on isolated MySQL |
|----------|--------------------------|
| Limit 2, occupancy 1, concurrent A+B | **Exactly one** create; final occupancy **2** |
| Limit 2, occupancy 2, concurrent A+B | **Both fail**; occupancy **2** |
| Restaurant A and B, each limit 2 occupancy 1, concurrent create | **Both succeed**; no cross-tenant wait on the other’s lock |
| Domain `create` throws | occupancy **0**; rollback |
| Retry after failed (cap 0) then cap 1 | second attempt creates |
| Lock acquisition | lock row present for `(restaurant, scopeId, posTerminals)` |
| Concurrent `resolveExisting` at cap | both return existing id; occupancy unchanged |
| `decide` `not_entitled` | fail closed; no insert |

## Command / result

```
pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.concurrency.test.ts
```

**10 passed / 0 failed** (includes Docker startup wait).

## TiDB note

Production is TiDB (MySQL protocol, pessimistic `FOR UPDATE`). This program verifies the primitive on InnoDB-compatible MySQL. A live Production TiDB race drill is **deferred** to a Production Apply program (`PRODUCTION MUTATION: 0` here).
