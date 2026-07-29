# RESOLVER-INVENTORY (post-remediation)

| ID | Resolver | Class |
|----|----------|-------|
| R01 | `getCommercialEntitlements` | **A** when bound · **B** when unbound (branch) |
| R02 | `getCommercialEntitlementsFromContext` | **B** (Legacy-only caller) |
| R03 | `resolveCommercialEntitlements` / matrix | **B** (unbound only) |
| R04 | `buildCommercialContextFromDb` | **B** (unbound only) |
| R05 | `resolveCommercialFactsFromSnapshot` | **A** |
| R06 | `buildEntitlementsFromCommercialSnapshot` | **A** |
| R07 | `resolveGuestOrderingAllowed` | inherits R01 (**A/B**) |
| R08 | `trpc.commercial.getEntitlements` / client hooks | inherits R01 |
| R09 | `CommercialReadService` | inherits R01; bound name from Snapshot |
| R10 | `resolveTrialStatusRead` | inherits R01; lifecycle fallbacks only when plan NONE |
| R11 | `resolvePlanLimitsForUser` | **A** bound · **B** unbound |
| R12 | Period `isSubscriptionActive` | **B**-lifecycle (not commercial config) |
| R13 | Catalog listPlans / admin Catalog | **D** config/selection only |

No **C** (Mixed) or entitlement-path **D** remain.
