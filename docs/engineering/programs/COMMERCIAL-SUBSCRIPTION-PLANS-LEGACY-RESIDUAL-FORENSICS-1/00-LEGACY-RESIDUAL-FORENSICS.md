# 00 — LEGACY RESIDUAL FORENSICS

**Program:** COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-FORENSICS-1  
**Status:** INVESTIGATION ONLY — COMPLETE  
**HEAD:** `9f825ce1` `feat(commercial): migrate subscription plan identity to live plan uuid`  
**Mutation:** NONE  
**Git:** no add / commit / push

## Purpose

Establish the exact remaining dependency graph of leftover subscription-plan identity after the successful OD-2 Production UUID cutover. This program does not remove, alter, or deploy anything.

## Architectural facts (already approved)

Canonical internal Commercial Plan identity:

```
commercial_plans.id = UUID
commercial_plans.code = business/catalog key
```

Not canonical:

```
subscription_plans.id
legacyPlanId
integer plan IDs
LEGACY_PLAN_BRIDGE
PLAN_ID_TO_CATALOG_PLAN
```

OD-2 Production cutover is complete. `0088` is applied. Production `user_subscriptions.planId` stores `commercial_plans.id` UUID.

## Current commercial authority (confirmed)

| Concern | Authority | Confirmed |
|---------|-----------|-----------|
| Live Plan identity / name / capabilities / limits / offer list price / visibility | `commercial_plans` + catalog services | YES |
| Charged Terms (historical amount, currency, cycle) | `commercial_subscription_bindings` charged fields | YES |
| MRR | Charged Terms → monthly equivalent | YES |
| Settlement / Check | financial settlement (untouched) | YES |
| Entitlements | `getCommercialEntitlements` → `requireFeature` via Live Plan | YES |

Do not move historical contract values into Live Plans.

## What remains after OD-2

Three leftover layers, proven separately:

1. **Leftover table** `subscription_plans` — exists in schema, ORM, seeds, reset scripts, and Production (3 catalog rows). No production commercial runtime read or write.
2. **Integer compatibility handle** `30001` / `30002` / `30003` — still the public/admin/checkout/webhook/trial *input* shape. Resolved through `resolveCanonicalLivePlanId` before persist.
3. **Bridge maps** `LEGACY_PLAN_BRIDGE` and `PLAN_ID_TO_CATALOG_PLAN` — still required to convert that handle into Live Plan UUID / catalog key.

## Classification vocabulary

| Code | Meaning |
|------|---------|
| A | LIVE RUNTIME READ |
| B | LIVE RUNTIME WRITE |
| C | ORM ONLY |
| D | SEED ONLY |
| E | TEST ONLY |
| F | SCRIPT ONLY |
| G | DOCUMENTATION ONLY |
| H | DEAD / UNREACHABLE |
| I | MIGRATION HISTORY |
| J | COMPATIBILITY |
| K | UNKNOWN — REQUIRES REVIEW |

No K findings. Every leftover reference classified.

## Headline findings

1. `subscription_plans` is **not** a live commercial authority. Helpers `getSubscriptionPlans` / `getSubscriptionPlanById` / `createSubscriptionPlan` have **zero production callers**.
2. Integer `planId` is **public API compatibility**, not internal identity. Writers persist UUID.
3. `LEGACY_PLAN_BRIDGE` is **runtime-required** until OD-3 + OD-4.
4. `bindings.legacyPlanId` is **required compatibility**, not identity.
5. Production leftover table holds **3 unused catalog rows** (`30001`–`30003`). Not customer contracts. No FK references it.
6. Nothing in this leftover set can be dropped now without a separate Architecture Authority program.

## Package

| File | Contents |
|------|----------|
| `01-SUBSCRIPTION-PLANS-DEPENDENCY-MATRIX.md` | Every `subscription_plans` / helper occurrence |
| `02-LEGACY-IDENTITY-MATRIX.md` | `legacyPlanId`, bridges, integers, schemas |
| `03-RUNTIME-DEPENDENCY-GRAPH.md` | Proven identity graph |
| `04-PRODUCTION-READONLY-PROOF.md` | SELECT-only Production proof |
| `05-SAFE-DELETE-READINESS.md` | A–J answers, all NO |
| `06-FUTURE-PROGRAM-RECOMMENDATIONS.md` | Recommended, not authorized |
| `FINAL-REPORT.md` | A–O |

## Stop

No cleanup. No OD-3. No OD-4. No SAFE DELETE. No deploy. No commit.
