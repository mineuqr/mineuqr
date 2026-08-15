# IS-SUBSCRIPTION-ACTIVE-FORENSICS.md

## Definition

`server/db.ts` `isSubscriptionActive(userId)` → `userHasSubscriptionEntitlement(rows)` → any row that is **period-valid trial or active**.

| Question | Answer |
|----------|--------|
| Authentication? | **No** |
| Account state ACTIVE/FROZEN/NONE? | **No** (expired → false, which often coincides with FROZEN, but it is not the hub) |
| Entitlement hub / Live Plan capability? | **No** |
| Subscription instance liveness? | **Yes** — coarse |

## Production mutation usages (`server/routers.ts`)

| Procedure | Current meaning | Correct meaning | Owner | Migrate? | Risk |
|-----------|-----------------|-----------------|-------|----------|------|
| `restaurant.updateTemplate` (premium) | Period-valid sub OR `role === admin` | Account ACTIVE + commercial grant for templates (legacy key) via hub; **admin is not a grant** | Entitlement | **Yes, later** | Admin skip violates CE-05 |
| `restaurant.updateCustomColors` | same | ACTIVE + `customColors` / plan composition via hub | Entitlement | **Yes, later** | same |
| `restaurant.updateCustomFonts` | same | ACTIVE + `customFonts` via hub | Entitlement | **Yes, later** | same |

## Other usages

| Site | Class |
|------|-------|
| `wave1ReadAuthority.ts` | Legacy fallback when hub unused — **LEGACY_COMPATIBILITY** read |
| Tests / mocks | TEST FIXTURE |

## Decision

Do **not** broadly replace `isSubscriptionActive` in this program.

It is **legacy UI/product convenience + coarse paid-gate**. Migration is allowed only when a canonical capability (or account-state-only gate) is named and `requireFeature` / Frozen already covers the mutation. Until then it remains a **documented duplicate authority**.
