# DOWNGRADE STATE MATRIX

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

Separate concepts. Do not collapse into “subscription expired.”

| Concept | Owner | Downgrade effect |
|---------|-------|------------------|
| 1. Existing resource validity | Domain row | Remains. Not deleted, hidden, or frozen by Commercial. |
| 2. New resource creation | Occupancy helper + `checkLimit` | Denied while `occupancy + 1 > cap`. |
| 3. Resource operation | Domain update / POS sale | Allowed. No occupancy consume. |
| 4. Reactivation | G-10 | Catalog: already occupies; flag flip is not a slot. POS deactivated→provisioned: `occupancyDelta = 1`, subject to current cap. |
| 5. Delete | Domain | Always allowed. Reduces COUNT. No debt counter. |
| 6. Downgrade | Commercial bind / live-plan limits | Changes effective cap only. |
| 7. Upgrade | Commercial bind / live-plan limits | New higher cap applies immediately to the next `checkLimit`. |
| 8. Plan expiration | Lifecycle / FROZEN / NONE | Distinct state. `checkLimit` deny or account freeze. Not a downgrade. |

## Occupancy vs cap after downgrade

| State | Existing occupancy | New `occupancyDelta = 1` | `occupancyDelta = 0` |
|-------|--------------------|--------------------------|----------------------|
| occupancy < cap | Allowed (already true) | Allowed if `occupancy + 1 <= cap` | Allowed if entitled |
| occupancy = cap | Allowed (grandfather N/A) | Denied | Allowed if entitled |
| occupancy > cap | Allowed (Policy B) | Denied | Allowed if entitled (hard `limit_exceeded` only) |

## Create permission after delete

Example: occupancy 5, new cap 3.

| After | Occupancy | Create `+1` | Result |
|-------|-----------|-------------|--------|
| downgrade | 5 | 6 | denied |
| delete 1 | 4 | 5 | denied |
| delete 2 | 3 | 4 | denied |
| delete 3 | 2 | 3 | allowed |

No stored downgrade debt. Permission is always `COUNT(*) + delta` vs `checkLimit()`.
