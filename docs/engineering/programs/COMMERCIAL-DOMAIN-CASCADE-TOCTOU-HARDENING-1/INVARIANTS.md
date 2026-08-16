# INVARIANTS

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

| ID | Statement | Evidence |
|----|-----------|----------|
| I-TOCTOU-01 | A child must not commit if the owning restaurant was deleted before the child txn commits | Delete ∥ category/item/POS/order: child counts 0 when restaurant 0 |
| I-TOCTOU-02 | A committed child has a valid owning restaurant | Post-race SQL: no child rows for deleted ids; create∥create children sit on live restaurant |
| I-TOCTOU-03 | Restaurant deletion must not commit while an incompatible child mutation can still commit against that deleted restaurant | Create after parent lock wait sees empty row and throws `RestaurantGoneError` |
| I-TOCTOU-04 | Concurrent ops resolve A (delete wins, create fails) or B (create wins, delete cascades the child). No orphan | Category race: create=rejected, restaurant=0, categories=0. Three-way create∥delete∥create: restaurant=0, categories=0 |
| I-TOCTOU-05 | Non-concurrent behavior unchanged | create∥create occupancy cap 2 → categories=2, restaurant=1 |
| I-TOCTOU-06 | Tenant isolation intact | A deleted; B create succeeded (~1549ms) |
| I-TOCTOU-07 | Occupancy remains COUNT(domain rows); no shadow counter | Occupancy helper untouched; create∥create COUNT=2=cap |
| I-TOCTOU-08 | A child must not survive merely because it is excluded from COUNT(*) | Order path has no occupancy COUNT; still orphan_count=0 |

Fail closed: missing restaurant id `2147483000` → `RestaurantGoneError` (do not use id `1`; stagIn may hold a copied production row).
