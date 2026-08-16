# G-10 / G-11 COMPATIBILITY

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  
**Production mutation:** 0. Policy files were not rewritten.

## G-10 — Production data semantics

| Rule | Production evidence | Application |
|------|---------------------|-------------|
| Inactive catalog remains occupied | 0 inactive restaurants, 0 inactive categories, 0 unavailable items. Census counts **all persisted rows**, not flags. | Restaurant/category/item COUNT does not filter `isActive` / `isAvailable`. |
| POS deactivated releases occupancy | 0 POS rows. No leftover deactivated occupancy. | POS COUNT is `registered` + `active` only. `deactivate` does not call the occupancy helper. |
| POS replacement is slot-neutral | 0 replaced terminals. | `occupancyDelta = 0` when previous lifecycle is provisioned. |

G-10 TiDB re-run this program: **9/9 PASS** on G07 only.

## G-11 Policy B — Production data semantics

| Rule | Production evidence | Application |
|------|---------------------|-------------|
| Downgrade does not mutate existing resources | Owner 1 still has 2 restaurants. No cleanup was performed. | Plan change does not call occupancy delete/deactivate. |
| Existing occupancy may exceed the new cap | Owner 1: occupancy 2 > cap 1. | Leftover is allowed. |
| New capacity-consuming mutations are blocked | Not executed on Production. | `occupancyDelta = 1` + `proposedTotal > cap` → `CommercialLimitExceededError`. |

G-11 TiDB re-run this program: **15/15 PASS** on G07 only.

## Deployment impact

The owner-1 leftover is **compatible** with Policy B. Deploying occupancy will start enforcing new creates against the current cap. It will not mutate the existing extra restaurant.

## Result

PASS — Production schema/data semantics are compatible with G-10 and G-11 Policy B.
