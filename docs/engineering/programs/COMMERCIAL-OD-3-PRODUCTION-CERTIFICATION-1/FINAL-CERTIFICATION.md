# FINAL CERTIFICATION — COMMERCIAL-OD-3-PRODUCTION-CERTIFICATION-1

## STATUS

**CERTIFIED**

The public/application-facing Commercial Plan identity is now the canonical Live Plan UUID in Production.

This does **not** prove that leftover bridges, `bindings.legacyPlanId`, webhook integer reads, or `subscription_plans` can be deleted.

## Production target

| Field | Value |
|-------|-------|
| environment | TiDB Cloud Production (`tidbcloud_prod`) |
| database | mineuqr |
| TLS / port | true / 4000 |
| timestamp | 2026-08-15T13:29:47.217Z |
| journal terminus | 0088 (`__drizzle_migrations.id` 6084102) |

## Deployed commit

`c1d64cba74024c22fc04a26b7c9f10caab39c5b7`  
GitHub Production deployment `5920875333` — success at `2026-08-15T13:26:40Z`.

## OD-3 identity

`commercial_plans.id` UUID

## Production subscription identity

| Metric | Value |
|--------|-------|
| UUID count | 7 |
| invalid count | 0 |
| orphan count | 0 |
| NULL | 0 |
| distinct UUIDs | 3 |

## Public API

UUID

## Checkout

UUID  
Live Plan Offer List Price

## Trial

UUID (Professional Live Plan; fail closed if unresolved)

## Webhooks

New = UUID  
Legacy read = retained safely

## Bindings

UUID agreement (disagreement = 0)  
`legacyPlanId` retained

## MRR

UNCHANGED

## Charged Terms

UNCHANGED

## Entitlements

UNCHANGED (Live Plan / hub)

## subscription_plans

NOT DELETED  
NO RUNTIME AUTHORITY

## Legacy bridges

REMAIN  
OD-4 TARGET

## Tests

112 / 112 passed

## Build

PASS (`pnpm build` exit 0)  
`pnpm check` fails on pre-existing debt only (186 diagnostics; no new OD-3 error)

## Production mutation

0

## Certification matrix

| Area | Expected | Result |
|------|----------|--------|
| Canonical identity | UUID | PASS |
| Subscription storage | UUID | PASS |
| Public API | UUID | PASS |
| Checkout | UUID | PASS |
| Pricing | UUID | PASS |
| Admin | UUID | PASS |
| Customer Success | UUID | PASS |
| Trial | UUID | PASS |
| PayPal new metadata | UUID | PASS |
| Tap new metadata | UUID | PASS |
| Legacy webhook read | Safe | PASS |
| Binding UUID | Correct | PASS |
| MRR | Charged Terms | PASS |
| Charged Terms | Unchanged | PASS |
| Entitlements | Live Plan | PASS |
| subscription_plans | No runtime authority | PASS |
| Legacy bridges | OD-4 only | PASS |
| Build | PASS | PASS |
| Tests | PASS | PASS |
| Production mutation | 0 | PASS |

## OD-4

**ELIGIBLE FOR ARCHITECTURE REVIEW**

Not automatically authorized. Not started.

Potential targets (review only):

- `LEGACY_PLAN_BRIDGE`
- `PLAN_ID_TO_CATALOG_PLAN`
- legacy webhook integer read
- `bindings.legacyPlanId`
- legacy DTO fields
- remaining integer resolver branches
- bootstrap compatibility

## SAFE DELETE

**NOT STARTED / BLOCKED**

`subscription_plans` remains. SAFE DELETE requires its own dependency proof, schema design, backup, preflight, migration, post-validation, and certification.

## What this certification does not prove

- leftover bridges can be deleted
- `subscription_plans` can be dropped
- `bindings.legacyPlanId` can be removed
- webhook legacy reads can be removed
