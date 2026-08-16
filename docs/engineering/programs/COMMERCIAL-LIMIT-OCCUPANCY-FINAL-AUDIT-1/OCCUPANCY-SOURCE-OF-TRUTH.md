# OCCUPANCY SOURCE OF TRUTH

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

| Limit key | Cap | Occupancy |
|-----------|-----|-----------|
| restaurants | `checkLimit` | `COUNT(*)` owner restaurants |
| categories | `checkLimit` | `COUNT(*)` restaurant categories |
| items | `checkLimit` | `COUNT(*)` restaurant items |
| posTerminals | `checkLimit` | COUNT provisioned lifecycles |

Not a second source of truth:

- `commercial_limit_occupancy_locks` — mutex only (no `occupied` column)
- `commercial_limit_values` — catalog caps, not usage
- `getRestaurantStats` — live COUNT, same occupancy set (no `isActive` filter)
- POS entitlement `provisioned` — derived from the same lifecycle filter
- No Redis / GET_LOCK / PosOccupancyService / admin quantity / billing quantity counter
