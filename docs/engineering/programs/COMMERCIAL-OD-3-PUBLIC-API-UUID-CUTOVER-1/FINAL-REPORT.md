# FINAL REPORT — COMMERCIAL-OD-3-PUBLIC-API-UUID-CUTOVER-1

## A. STATUS

OD-3: **COMPLETE** (implementation + tests + build)

Not committed. Not pushed. Not deployed.

## B. CANONICAL IDENTITY

`commercial_plans.id` UUID — PASS

## C. PUBLIC CONTRACT

Before: `planId: number`  
After: `planId: UUID` (`livePlanUuidInput`)

## D. CUTOVER SURFACE

- Checkout PayPal / Tap
- Public Pricing
- Admin create/update (and retired restaurant-scoped input schemas)
- listPlans `id`
- Customer Success
- Trial ingress (removed 30002 fallback)
- PayPal / Tap **writes**
- Admin statistics `subscriptionsByPlan.planId`
- Subscription plan view `id` on UUID path

## E. LEGACY READS

- Webhook integer / digit-string metadata (`parseWebhookPlanRef`)
- `resolveCanonicalLivePlanId` integer branch
- Bind / entitlement leftover fallbacks
- `PLAN_ID_TO_CATALOG_PLAN` unbound path
- `PublicCatalogOffering.legacyPlanId` (unused by Pricing/CS checkout after this program)
- Historical tests / 0088 / seeds

## F. LEGACY WRITES

Zero **normal public/application** integer writers.

Remaining: reverse-map `bindings.legacyPlanId` (existing compatibility, not a new writer).

## G. WEBHOOKS

New payload identity: **UUID**  
Legacy payload support: **YES**  
Reason: in-flight integer metadata cannot be proven empty.

## H. TRIAL

Final identity: **UUID** (catalog professional). Fail closed if unresolved.

## I. CHECKOUT

Identity: **UUID**  
Price source: Live Plan Offer List Price (unchanged)

## J. MRR

UNCHANGED

## K. CHARGED TERMS

UNCHANGED

## L. SUBSCRIPTION_PLANS

No runtime commercial dependency. Table **NOT** deleted.

## M. BRIDGES

`LEGACY_PLAN_BRIDGE`: **remaining**  
`PLAN_ID_TO_CATALOG_PLAN`: **remaining**

## N. BINDINGS

`legacyPlanId`: **retained**  
Reason: existing bind compatibility; OD-4 / schema program.

## O. PRODUCTION

Before: OD-2 / forensics proof — 7/7 UUID subscriptions; leftover table 3 rows; 0088 applied.  
After: no Production mutation in this program. App not deployed.

## P. TESTS

OD-3 related set: **112** total, **112** passed, **0** failed.

## Q. BUILD

`pnpm build`: **PASS**

## R. OD-4

**BLOCKED**

Blockers: webhook leftover read; bind reverse-map; unbound CommercialContext map; bootstrap; DTO `legacyPlanId`; post-deploy certification; AA approval.

## S. SAFE DELETE

**BLOCKED**

Blockers: leftover table + ORM + seeds + reset scripts + bridges + `legacyPlanId` column + AA approval.
