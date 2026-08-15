# 05 — SAFE DELETE READINESS

All answers are **NO**. This program does not authorize deletion.

## A. Can `subscription_plans` be dropped NOW?

**NO.**

- **Blocker:** Table still exists in Production with 3 rows; ORM + journal history + reset/seed scripts + stale audit join still name it. Drop is a schema migration. Architecture Authority has not authorized SAFE DELETE.
- **Owner:** Architecture Authority / schema governance
- **Replacement:** none needed for runtime (already unused). Historical rows must be archived or explicitly accepted as discardable leftover catalog.
- **Prerequisite:** OD-3 + OD-4 complete; script/seed/ORM uncoupled; AA approval; new gated migration (not an edit of 0000–0006)
- **Suggested program:** SAFE DELETE `subscription_plans` (gated, later)

## B. Can `subscription_plans` ORM be removed NOW?

**NO.**

- **Blocker:** `drizzle/schema.ts` `subscriptionPlans` + `server/db.ts` helpers + `InsertSubscriptionPlan` / `SelectSubscriptionPlan`. Removing ORM while the table remains desyncs Drizzle from Production. Dozens of tests still mock the helpers.
- **Owner:** Commercial platform + test owners
- **Replacement:** Live Plan services already replace runtime use
- **Prerequisite:** table drop decision **or** an explicit “ORM residual allowed while table remains” policy; test mock retirement
- **Suggested program:** part of SAFE DELETE, or a later dead-helper cleanup after AA confirms table stays temporarily

## C. Can `subscription_plans` seeds be removed NOW?

**NO.**

- **Blocker:** `server/seed-plans.mjs` is the documented emergency leftover-table repair path. `clean-db-2` **keeps** the table as a reference table. Removing seeds while reset scripts expect the table creates a bootstrap hole.
- **Owner:** ops / bootstrap
- **Replacement:** Commercial Hub / persistent catalog bootstrap (`LEGACY_PLAN_BRIDGE` codes → `commercial_plans`)
- **Prerequisite:** reset-script inventory updated; AA confirms leftover table is not required for dev reset
- **Suggested program:** SAFE DELETE or a bootstrap-script retirement after OD-4

## D. Can `subscription_plans` reset-script references be removed NOW?

**NO.**

- **Blocker:** `scripts/clean-db-2-execute.mjs`, `production-operational-data-reset.mjs`, `financial-epoch-reset.mjs` treat the table as KEEP/inventory. `data-integrity-audit-phase2-readonly.mjs` S5 still JOINs it (stale, but present).
- **Owner:** ops scripts
- **Replacement:** inventory `commercial_plans` instead; rewrite S5 to join `commercial_plans.id`
- **Prerequisite:** AA script program; must not be done as a silent side effect of this forensics
- **Suggested program:** ops-script alignment (can run in parallel with OD-3; not a drop)

## E. Can `LEGACY_PLAN_BRIDGE` be removed NOW?

**NO.**

- **Blocker:** `resolveCanonicalLivePlanId`, checkout offer, webhook `isKnownLegacyPlanId`, trial fallback 30002, `listPlans` integer ids, `persistentCatalogBootstrap`, entitlement fallback
- **Owner:** Commercial catalog
- **Replacement:** public/admin/checkout/webhook accept UUID (or `code`) only; bootstrap seeds by `commercial_plans.code` without integer ids
- **Prerequisite:** OD-3 public/API UUID cutover **then** OD-4
- **Suggested program:** OD-4 Legacy Bridge Retirement

## F. Can `PLAN_ID_TO_CATALOG_PLAN` be removed NOW?

**NO.**

- **Blocker:** `buildCommercialContext` + `buildCommercialContextFromDb` unbound path; unit test contract
- **Owner:** Commercial context / entitlements
- **Replacement:** UUID → `planService.get` → `code` → catalog key (already the Production UUID path)
- **Prerequisite:** delete digit-string branch after proving no integer `planId` can enter CommercialContext; OD-4
- **Suggested program:** OD-4 (same bridge family)

## G. Can `bindings.legacyPlanId` be removed NOW?

**NO.**

- **Blocker:** Column is written by every bind (`ensureLivePlanBoundForSubscription`, trial, register, admin, webhooks). Resolver and snapshot loader still read it as fallback. Schema change required.
- **Owner:** Commercial bindings
- **Replacement:** bind by UUID only; display via `commercial_plans`
- **Prerequisite:** OD-3 (stop accepting integers) + OD-4 (stop resolving integers) + schema migration
- **Suggested program:** OD-4 follow-on schema drop, not OD-3 alone

## H. Can public integer `planId` be removed NOW?

**NO.**

- **Blocker:** Public contract: `createCheckoutSession`, `createTapCheckout`, `listPlans.id`, `Pricing.tsx`, Customer Success `parseInt`, PayPal `custom_id.planId`, Tap `metadata.plan_id`, admin `z.number()`
- **Owner:** Public API + Checkout + Admin
- **Replacement:** UUID (`commercial_plans.id`) or stable `code` as the external handle — AA must choose
- **Prerequisite:** OD-3 design + client + webhook payload versioning
- **Suggested program:** OD-3 Public/API UUID Cutover

## I. Can trial integer identity be removed NOW?

**NO.**

- **Blocker:** `resolveCanonicalLivePlanId(30002)` fallback; bind still writes `legacyPlanId` from reverse bridge
- **Owner:** Trial / register
- **Replacement:** Trial policy → Live Plan UUID only; bind without integer
- **Prerequisite:** catalog trial policy always present; OD-3/OD-4 so fallback handle is unused
- **Suggested program:** can be a clause of OD-3 or a small trial-UUID program after OD-3

## J. Can webhook integer metadata be removed NOW?

**NO.**

- **Blocker:** In-flight and future PayPal/Tap payloads still carry the integer we send today. Changing metadata without a dual-read period would fail activation for orders created under the current contract.
- **Owner:** Payments / webhooks
- **Replacement:** metadata UUID or omit plan and resolve from bound subscription / Live Plan only
- **Prerequisite:** OD-3 checkout starts sending UUID; dual-read in webhooks; then stop sending integer
- **Suggested program:** OD-3 (payload) with explicit webhook dual-read; do not change payloads in this program

## Summary

| Artifact | Removable now? |
|----------|----------------|
| leftover table | NO |
| leftover ORM | NO |
| leftover seeds | NO |
| leftover reset scripts | NO |
| `LEGACY_PLAN_BRIDGE` | NO |
| `PLAN_ID_TO_CATALOG_PLAN` | NO |
| `bindings.legacyPlanId` | NO |
| public integer `planId` | NO |
| trial integer | NO |
| webhook integer metadata | NO |

No implied cleanup. Architecture Authority decides the next program.
