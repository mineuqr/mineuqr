# TEST PLAN

| # | Proof |
|---|--------|
| 1–2 | Cascade deletes POS tables before restaurant; guards require restaurantId predicates |
| 3 | Grants deleted with restaurant |
| 4 | Sale idempotency deleted (operational, documented) |
| 5–6 | Predicate is restaurantId only (A cannot match B) |
| 7 | Restaurant delete throw after POS cleanup → no completed audit (tx callback fails) |
| 8 | No lifecycle filter — all terminal states deleted |
| 9–10 | Existing cascade + POS suites |
| 11–12 | Occupancy helper unchanged; COUNT cannot see deleted rows; occupancy guard forbids orphan filters |
| 13 | No background cleanup job |
