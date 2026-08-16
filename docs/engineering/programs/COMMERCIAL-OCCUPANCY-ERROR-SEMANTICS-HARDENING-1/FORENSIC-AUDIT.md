# FORENSIC AUDIT

Verified in current code.

## Primitive

`withCommercialLimitOccupancy` throws:

- `CommercialLimitExceededError` (`code: COMMERCIAL_LIMIT_EXCEEDED`, `reasonCode` e.g. `limit_exceeded`)
- `CommercialOccupancyUnavailableError` (`code: COMMERCIAL_OCCUPANCY_UNAVAILABLE`) when `getDb()` is missing (fail closed)

## Before this program

| Consumer | Limit exceeded | Occupancy unavailable |
|----------|----------------|------------------------|
| Restaurant/category/item `mapOccupancyError` | tRPC `FORBIDDEN` + quota Arabic | tRPC `FORBIDDEN` + **`غير مصرح بالوصول`** (auth-shaped) |
| POS `consumeProvisionedSlot` | wrapped `PosEntitlementDeniedError(reasonCode)` | wrapped `PosEntitlementDeniedError("occupancy_unavailable")` |
| POS `mapPosError` | `FORBIDDEN` + **`غير مصرح بالوصول`** | same |
| Register HTTP (G-04) | 403 + `code: limit_exceeded` | 403 + `code: commercial_capacity_unavailable` (not auth copy) |

tRPC collapsed occupancy infrastructure failure into authorization denial.
