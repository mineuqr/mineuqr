# 08 — DTO CLEANUP

| Field | Action |
|-------|--------|
| `LivePlanCheckoutOffer` leftover integer | **REMOVED** |
| `LivePlanOffering` leftover integer | **REMOVED** |
| `resolveTrialPolicyFromCatalog` leftover integer | **REMOVED** |
| `PublicCatalogOffering.legacyPlanId` | **RETAINED** — live Production API still returns it; client Pricing/CS do not use it for identity |
| `bindings.legacyPlanId` | **COLUMN RETAINED** |

Public DTO field was not removed: live origin still serves it, and removing it requires a deployed contract change plus full consumer search (frontend, tests, CS, integrations). Residual, not canonical identity.
