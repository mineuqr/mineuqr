# CONCURRENCY TEST PLAN

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

## Environment

G07_DATABASE_URL only. `mineuqr-stagIn`. Independent pools `db` / `dbB`. Synthetic owners `981001001` / `981001002`.

Admin vs owner is a **router dispatch**. Both now call the same occupancy helper. TiDB races therefore run two occupancy creates on independent connections (the production admin/owner split). Guards prove the router no longer has a skip.

## Matrix

| # | Case | Expected |
|---|------|----------|
| 1 | Create at cap-1 | occupancy = cap |
| 2 | Create at cap | rejected; occupancy = cap |
| 3 | Concurrent last-slot creates | occupancy <= cap |
| 4 | Owner ∥ admin last slot | exactly one success; occupancy = cap |
| 5 | Admin ∥ delete | restaurant 0, categories 0 |
| 6 | Admin ∥ admin last slot | occupancy = cap |
| 7 | Tenant A ∥ tenant B | each occupancy 1; no cross lock |
| 8 | Item owner ∥ admin last slot | occupancy = cap |
| 9 | Failure after insert | occupancy unchanged (0) |

Hard-delete of a category is COUNT(*) after DELETE; no shadow counter. Covered by existing occupancy delete races (G-08) plus admin rows being ordinary domain rows.
