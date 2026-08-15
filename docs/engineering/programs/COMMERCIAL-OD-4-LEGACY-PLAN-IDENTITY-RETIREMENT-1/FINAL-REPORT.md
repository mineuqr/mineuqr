# FINAL REPORT — COMMERCIAL-OD-4-LEGACY-PLAN-IDENTITY-RETIREMENT-1

## STATUS

**BLOCKED**

## Canonical identity

`commercial_plans.id` UUID

## Public identity

UUID (OD-3 certified; this program not deployed)

## Subscription identity

UUID (OD-3 certified)

## Binding identity

UUID (`planId`)

## leftoverPlanId / bind column

**BLOCKED WITH EXACT REASON:** column not dropped — no verified Production backup, no authorized DDL, must not add an unapplied `0089` that deploy could migrate. Writers were pointed at UUID `planId` and no longer reverse-map leftover integers.

## LEGACY_PLAN_BRIDGE

**BLOCKED / RETAINED** — webhook leftover integer read still required

## PLAN_ID_TO_CATALOG_PLAN

**BLOCKED / RETAINED** — removed from CommercialContext / FromDb; file remains for `isCanonicalCurrentPlan(number)` and tests

## Integer runtime writers

Public/admin: **0** (OD-3). Bind leftover integer writers: **stopped** in trial/register/admin/webhook bind calls.

## Integer runtime readers

Webhook leftover read: **1 path (retained)**. Display/view leftover branches: retained. Client integer current-plan helper: retained.

## Webhook leftover read

**BLOCKED / RETAINED** — in-flight provider payloads cannot be proven empty; provider APIs were not called

## Trial integer fallback

**REMOVED** (OD-3 + this program’s trial DTO cleanup)

## Checkout

UUID → Live Plan Offer List Price

## Checkout price authority

Live Plan Offer List Price

## MRR

UNCHANGED

## Charged Terms

UNCHANGED

## Entitlements

Policy unchanged (Live Plan / hub). Unbound UUID path now resolves Live Plan capabilities instead of the leftover integer map (which discarded UUID rows).

## subscription_plans

NOT DELETED

## SAFE DELETE

**BLOCKED**

## Tests

Not certified PASS. Fixture migration incomplete.

## Build

Not re-run to certification PASS after the full edit set.

## Production

**NOT CERTIFIED** for OD-4. OD-3 Production certification remains the last certified Production state.

## Certification matrix

| Area | Expected | Result |
|------|----------|--------|
| Canonical identity | UUID | PASS (prior) |
| Public API | UUID | PASS (prior / not redeployed) |
| Subscription storage | UUID | PASS (prior) |
| Binding identity | UUID | PASS (prior) |
| leftover bind column | Removed | **BLOCKED** |
| LEGACY_PLAN_BRIDGE | Removed | **BLOCKED** |
| PLAN_ID_TO_CATALOG_PLAN | Removed | **BLOCKED** |
| Integer writers | 0 | Public 0; leftover bind writes stopped |
| Integer runtime readers | 0 | **BLOCKED** (webhook) |
| Trial integer fallback | Removed | PASS |
| Webhook integer read | Retired | **BLOCKED** |
| Checkout | UUID | PASS (code) |
| Checkout price | Live Plan | PASS |
| MRR | Charged Terms | PASS |
| Charged Terms | Unchanged | PASS |
| Entitlements | Unchanged | PASS (authority) |
| subscription_plans | Untouched | PASS |
| Provider IDs | Unchanged | PASS |
| Tests | PASS | **BLOCKED** |
| Build | PASS | **NOT CERTIFIED** |
| Production | CERTIFIED | **NOT CERTIFIED** |

## Next

Architecture Authority must review. Do not start SAFE DELETE, Payment Provider, Tax, FX, Refund, Credit Note, POS, Staff Access, or Inventory.

To unblock OD-4 later:

1. Prove provider in-flight leftover metadata is empty (or wait out provider retry windows with evidence)
2. Verify Production backup
3. Finish leftover test-fixture cleanup
4. Deploy application
5. Fresh Production preflight
6. Then consider leftover bind-column drop as its own authorized migration
