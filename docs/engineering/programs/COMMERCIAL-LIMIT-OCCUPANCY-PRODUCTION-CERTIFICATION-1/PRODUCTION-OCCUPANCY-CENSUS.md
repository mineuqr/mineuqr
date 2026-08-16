# PRODUCTION OCCUPANCY CENSUS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Mode:** READ ONLY. G-10 definitions. No resource repair.

## Global counts

| RESOURCE | LIMIT KEY | CURRENT OCCUPANCY | Notes |
|----------|-----------|-------------------|-------|
| restaurants | restaurants | 4 | inactive = 0; all persisted rows occupy |
| categories | categories | 7 | inactive = 0; `isActive` does not release |
| items | items | 11 | unavailable = 0; `isAvailable` does not release |
| POS terminals | posTerminals | 0 | registered+active only; provisioned/deactivated/replaced all 0 |

## Effective caps (from current Live Plan bindings)

| RESOURCE | CURRENT EFFECTIVE CAP | OVER-CAP COUNT |
|----------|----------------------|----------------|
| restaurants | owner-scoped; typical sellable cap = 1 | **1 owner** |
| categories | restaurant-scoped; 25 or 100 on observed restaurants | 0 |
| items | restaurant-scoped; 500 on the restaurant that has items | 0 |
| POS terminals | key missing on all Live Plans | 0 (occupancy 0) |

## Per-owner restaurants

| userId | occupancy | cap |
|--------|-----------|-----|
| 1 | 2 | 1 |
| 14760004 | 1 | 1 |
| 21630002 | 1 | 1 |

## Per-restaurant catalog

| restaurantId | categories | category cap | items | item cap |
|--------------|------------|--------------|-------|----------|
| 720002 | 2 | 25 | 0 | — |
| 720007 | 4 | 25 | 11 | 500 |
| 900001 | 1 | 100 | 0 | — |

## Over-cap

One leftover: owner `userId = 1` has **2** restaurants against cap **1**.

Classification: **G-11 Policy B leftover**. Not a deployment blocker.

- Do not delete, deactivate, or freeze the extra restaurant.
- After occupancy deploy, a new restaurant create for that owner is denied until `COUNT(*) + 1 <= cap`.
- Existing restaurants remain valid and operational.

No category, item, or POS over-cap.

## Result

PASS — occupancy is readable. The single restaurant leftover is expected Policy B behavior, not an unexpected blocker.
