# OCCUPANCY READ PATH

**Program:** POST-DEPLOYMENT-COMMERCIAL-OCCUPANCY-SMOKE-1  
**Mode:** READ ONLY. G-10 definitions.

## Canonical semantics (deployed source)

- occupancy = caller domain `COUNT(*)`
- cap = `checkLimit()`
- serialization = tenant-scoped `commercial_limit_occupancy_locks` PK `(scopeKind, scopeId, limitKey)`
- no second occupancy counter
- no `PosOccupancyService`
- no `GET_LOCK`
- Live Plan rows are not the occupancy mutex

Restaurant / category / item counts in `create*WithCommercialLimit` do **not** filter `isActive` / `isAvailable`.  
POS counts `registered` + `active` only.

## Production census (unchanged from certification)

| Resource | Occupancy | Inactive / unavailable | Cap notes |
|----------|-----------|------------------------|-----------|
| restaurants | 4 | inactive 0 | owner-scoped; typical sellable cap 1 |
| categories | 7 | inactive 0 | restaurant-scoped 25 or 100 |
| items | 11 | unavailable 0 | 500 on the restaurant that has items |
| POS provisioned | 0 | deactivated 0 / replaced 0 | key missing on Live Plans |

Per-owner restaurants: userId 1 = 2/1; 14760004 = 1/1; 21630002 = 1/1.

No occupancy rows were inserted, updated, or deleted. Lock table count remains 0.
