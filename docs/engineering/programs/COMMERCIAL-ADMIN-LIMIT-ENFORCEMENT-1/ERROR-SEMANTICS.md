# ERROR SEMANTICS

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  

G-06 preserved. Admin capacity failure is **not** remapped to unauthorized.

| Condition | tRPC | Meaning |
|-----------|------|---------|
| `CommercialLimitExceededError` | FORBIDDEN | quota / limit |
| `CommercialOccupancyUnavailableError` | INTERNAL_SERVER_ERROR | infrastructure |
| `RestaurantGoneError` | NOT_FOUND | parent gone (mapped in `mapOccupancyError`) |
| Missing restaurant access | FORBIDDEN (RBAC) | authorization |
| Cross-tenant category on item create | FORBIDDEN `غير مصرح بالوصول` | tenant integrity, before occupancy |

Admin at cap receives the same Arabic quota message as the owner (`خطتك الحالية تسمح بحد أقصى …`).

TiDB unit assertion: exceeded → FORBIDDEN, message does not match `/unauthor/i`; unavailable → INTERNAL_SERVER_ERROR.
