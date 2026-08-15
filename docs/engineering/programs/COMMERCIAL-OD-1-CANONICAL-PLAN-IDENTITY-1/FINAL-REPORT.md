# COMMERCIAL-OD-1-CANONICAL-PLAN-IDENTITY-1 — FINAL REPORT

Date: 2026-08-15  
Type: Architecture decision only

## A. STATUS

**CANONICAL PLAN IDENTITY DECISION — APPROVED**

## B. DECISION

`commercial_plans.id` UUID = the ONE canonical internal Commercial Plan identity.

`subscription_plans.id`, `legacyPlanId`, integer plan IDs, `LEGACY_PLAN_BRIDGE`, and `PLAN_ID_TO_CATALOG_PLAN` are not canonical internal plan identities.

## C. UUID VS CODE

| | Role |
|--|------|
| **UUID** (`commercial_plans.id`) | Canonical internal identity |
| **Code** (`basic` / `professional` / `enterprise`) | Stable business / catalog key |

Code is unique and currently immutable on `saveLive`. It remains a label and bootstrap lookup key. It is not the row identity.

## D. CURRENT LEGACY IDENTITY

| Artifact | Role after this decision |
|----------|--------------------------|
| `user_subscriptions.planId` | Compatibility integer until OD-2 |
| `bindings.legacyPlanId` | Compatibility copy; `bindings.planId` is already UUID |
| `LEGACY_PLAN_BRIDGE` | Temporary identity bridge — not authority |
| `PLAN_ID_TO_CATALOG_PLAN` | Duplicate temporary bridge |

## E. FUTURE CUTOVER

1. OD-5 production mapping proof  
2. OD-2 ALTER subscription column to UUID  
3. OD-3 checkout / admin / public integer APIs → UUID  
4. Trial writes UUID  
5. Webhook metadata echoes UUID  
6. OD-4 remove both bridges  
7. Optional: register I-OD1-* on ADR-034  

Do not start those from this program.

## F. SUBSCRIPTION

`user_subscriptions.planId` **can eventually** become Live Plan UUID. Bound rows already have the UUID. Bridged integers 30001–30003 map 1:1 via code. Unmapped integers fail closed. Not executed here.

## G. CHECKOUT

Price stays Live Plan Offer List Price. Future input identity = UUID. Current input remains integer. No checkout change in this program.

## H. WEBHOOKS

Echoed `planId` / `plan_id` = compatibility metadata (Class B). Provider charge/order ids = Class F. Future: echo UUID. No payload change now.

## I. TRIAL

14-day Professional unchanged. Future: write Professional Live Plan UUID. Current: integer 30002 path.

## J. API

`PublicCatalogOffering.planId` is already UUID (canonical). Integer fields remain compatibility until OD-3. `planCode` remains the business key.

## K. MULTI-TENANT

Platform-global. One UUID identifies one Live Plan for the whole platform. No composite tenant identity.

## L. HISTORICAL CONTRACTS

Charged Terms remain independent. Canonical identity must not reconstruct historical price. Hide, do not hard-delete, Live Plans that bindings still reference.

## M. INVARIANTS

I-OD1-01 through I-OD1-09 accepted. See `ARCHITECTURAL-INVARIANTS.md`.

## N. ADR IMPACT

034 / 035 / 036: **no file amended.** Proposed 034 identity addendum documented only.

## O. GIT

See live report in the operator return. This program adds only this documentation directory. No commit. No push. No deploy.

## STOP

No implementation. No SAFE DELETE. No identity cutover.
