# LONG-TERM QUALITY GATE

## 1–10 for the recommended primitive (A+F lock row + COUNT)

1. **Professional SaaS today:** limits are a billed promise; concurrent over-provision is an invariant break, even if rare.  
2. **Restaurants:** lock per owner for `restaurants`; per restaurant for menu/POS.  
3. **Branches:** future `branches` key uses the same helper with a branch or restaurant scope — do not overload `posTerminals` or `devices`.  
4. **Concurrent users:** serialize only the provisioning hotspot, not reads or sales.  
5. **Resource types:** one helper, many `limitKey` + count adapters.  
6. **Future capabilities:** add-ons that are quantities reuse the helper; features stay `requireFeature`.  
7. **Debt if we skip forever:** over-cap rows remain possible.  
8. **Complexity introduced (when built):** one lock table or parent-row convention; create paths join a transaction.  
9. **Complexity avoided:** reservations, counters, GET_LOCK, POS locks, catalog-row locks, global locks.  
10. **Deferred:** freeze-on-downgrade, quantity for orphan keys, commercial idempotency table, live TiDB race drill until implementation.

## Classification

| Item | Class |
|------|-------|
| Document the race and chosen primitive | **A. REQUIRED NOW** (this program) |
| Shared occupancy helper + real DB concurrency tests | **B. REQUIRED FOUNDATION FOR FUTURE** |
| Parent-row lock as no-DDL interim | **B** (implementation choice) |
| Explicit occupancy counters | **C** unless COUNT is impossible |
| Reservation-first | **C** |
| Quantity enforcement for `staffAccounts` / `branches` / `devices` limit | **C** (product + capability work first) |
| Plan-downgrade freeze | **C** (product policy) |
| Client idempotency on restaurant/category/item create | **C** |
| POS-specific lock / second commercial system | **D. SHOULD NEVER** |
| Lock `commercial_limit_values` | **D** |
| Global lock | **D** |
| “Transaction around COUNT+INSERT is enough” | **D** (false) |
| GET_LOCK without TiDB proof | **D** for now |

## Why not REQUIRED NOW implementation

Provisioning QPS is low. The architecture is decided. Shipping an untested lock across four create paths without a real-database race suite would be premature complexity. Successor implementation program owns DDL + tests.
