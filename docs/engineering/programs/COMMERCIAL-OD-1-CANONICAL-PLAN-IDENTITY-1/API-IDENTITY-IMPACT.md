# API-IDENTITY-IMPACT

No API was removed or renamed.

| Field | Classification | Future |
|-------|----------------|--------|
| `PublicCatalogOffering.planId` | **Canonical identity** (UUID already) | Keep |
| `PublicCatalogOffering.planCode` | **Business key** | Keep |
| `PublicCatalogOffering.planName` | **Display** | Keep |
| `PublicCatalogOffering.legacyPlanId` | **Compatibility** | Keep until checkout accepts UUID |
| `listPlans[].id` (integer) | **Compatibility** | Replace with UUID after OD-3 |
| `createCheckoutSession.planId` | **Compatibility** (number) | Become UUID |
| `createTapCheckout.planId` | **Compatibility** (number) | Become UUID |
| Admin create/update `planId` | **Compatibility** (number) | Become UUID |
| Customer Success `legacyPlanId` | **Compatibility** | Retire after cutover |
| `OwnerCommercialState.planId` | **Compatibility** (row int) | Become UUID with column |
| `OwnerCommercialState.planCode` | **Business key** | Keep |
| Charged Terms `planId` | **Canonical template pointer** (UUID) | Keep; not a price |

Consumers of the integer exist. Compatibility fields stay until a dedicated API cutover (OD-3).
