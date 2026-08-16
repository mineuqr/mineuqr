# ERROR SEMANTICS AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

G-06 globally.

| Error | Mapping | Must not become |
|-------|---------|-----------------|
| `CommercialLimitExceededError` | tRPC `FORBIDDEN` + quota copy | “unauthorized” |
| `CommercialOccupancyUnavailableError` | `INTERNAL_SERVER_ERROR` + capacity-unavailable copy | `FORBIDDEN` / `limit_exceeded` |
| `PosEntitlementDeniedError` | `FORBIDDEN` authorization copy | quota (used for restaurant_not_found / unused assertProvisioningAllowed) |

`posRouter.mapPosError` checks occupancy errors **first**.

Onboarding HTTP: exceeded ≠ 401; unavailable ≠ auth copy.

`assertProvisioningAllowed` (unused) would collapse limit deny into `PosEntitlementDeniedError`. Classified SAFE TO DEFER; not on the live create path.
