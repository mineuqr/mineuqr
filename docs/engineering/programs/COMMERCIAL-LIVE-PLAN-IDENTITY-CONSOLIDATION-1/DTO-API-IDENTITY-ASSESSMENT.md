# DTO-API-IDENTITY-ASSESSMENT

| Field | Kind | Consumers | Removal |
|-------|------|-----------|---------|
| `subscription.listPlans[].id` | Compatibility integer | Tests; any client using listPlans | After checkout UUID cutover |
| `createCheckoutSession.planId` | Compatibility integer | Pricing.tsx | First-party — may migrate when AA approves |
| `PublicCatalogOffering.planId` | Canonical UUID | Pricing card key | Keep |
| `PublicCatalogOffering.legacyPlanId` | Compatibility | Pricing checkout button | Keep until checkout accepts UUID |
| `OwnerCommercialState.planId` | Integer from row | Admin/CRS | Keep with column |
| `OwnerCommercialState.planCode` | Canonical catalog key | Hub | Keep |
| Admin `planId: number` | Compatibility | Admin UI / Customer Success | Keep |

No public field removed merely for aesthetics. Consumers exist.
