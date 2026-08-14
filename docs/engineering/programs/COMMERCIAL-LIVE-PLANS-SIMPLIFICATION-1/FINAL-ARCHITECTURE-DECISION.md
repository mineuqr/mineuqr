# FINAL-ARCHITECTURE-DECISION.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14  
**Authority:** Architecture Authority

---

# BLOCKED

---

## 1. Blocking issue

Migration `0086` plus the already-rewritten Drizzle/hydrate schema is **not a safe cutover**. The implementation’s live-plan runtime is directionally correct for **bound** subscribers, but:

- the code **cannot run** on the current production catalog schema;
- `0086` **drops** version/snapshot tables and **deletes** unmatched bindings before charged-term backfill is proven;
- a null `chargedAmount` **falls back to the live list price** (policy 6);
- `updatePlan` **bypasses** atomic save.

## 2. Evidence

| Gate | Evidence |
|------|----------|
| Schema mismatch | Production: `commercial_prices.planVersionId` (0084). Code: `commercial_prices.planId` notNull (`server/db/schema/commercial/tables.ts`). Hydrate SELECTs `featureBundleId` / `planId` (`drizzleCatalogPersistence.ts`). |
| Binding swallow | `getSubscriptionCommercialBinding` `catch { return null }` → pre-0086 unknown column looks unbound → `planFeatureMatrix`. |
| Destructive 0086 | `DROP TABLE commercial_snapshot_definitions`, `commercial_plan_versions`, …; `DELETE FROM commercial_subscription_bindings WHERE planId IS NULL`. |
| Charged-term fallback | `adoptionService.ts` `resolveLivePlanCapabilities`: null binding amount → `chargedTermsForPlan` (current price). |
| Atomic save bypass | `commercialCatalogRouter.updatePlan` → `planService.update`; UI `CatalogManagementPanels` still calls `updatePlan`. |
| CRS stale source | `CommercialReadService.ts` only overlays name when source is `"snapshot"` / `"snapshot_fail_closed"`. Bound live_plan uses `"live_plan"`. |
| Typecheck | `tsc --noEmit` exit **2**. Program files: `CatalogManagementPanels` missing `stateLabel`; `PlanCreationWizard` alert props. |
| Projection guard | `commercialProjectionGeneration.guards.test.ts` “seed adoption uses Projection IDs” **FAIL** — seed file no longer inlines `"ordering"` (moved to bootstrap). |

## 3. Owning layer

**Commercial Catalog persistence + adoption bindings** (`drizzle/0086_commercial_live_plans.sql`, `drizzleCatalogPersistence.ts`, `adoptionService.ts`), with a secondary **Catalog Admin API** defect (`updatePlan`).

## 4. Minimal repair

Do **not** expand Subscription, Billing, Checkout, Discovery, or Projection.

1. **Split 0086** into an additive Phase A only: add columns, backfill composition/prices/bindings/charged terms, **keep** `planVersionId`, `snapshotId`, and version/snapshot tables.
2. **Do not DELETE** bindings; emit an exception list for null `planId` after backfill.
3. **Verify** on staging: every standard-plan binding has `planId` + `chargedAmount` (or documented exception).
4. Remove the **live-price fallback** on existing bindings with null charged amount (keep null / omit charged terms; do not substitute current list price).
5. Make `updatePlan` delegate to `saveLive` **or** remove it from UI and API.
6. Teach CRS to treat `live_plan` like the former snapshot display source.
7. Deploy code **only after** Phase A is applied (never code-first).
8. Table DROPs = **separate retirement program** after soak.

## 5. Why this does not expand scope

These repairs only make the already-approved live-plan cutover **operable and non-destructive**. They do not add plans, change pricing policy, redesign checkout, or restore version publication.

---

## Mandatory test matrix

| # | Suite | File(s) | Count | Result | Interpretation |
|---|-------|---------|-------|--------|----------------|
| 1 | Typecheck | `tsc --noEmit` | n/a | **FAIL** (exit 2) | Repo-wide errors plus new catalog UI errors. Production build not attempted. |
| 2 | Unit / live save | `commercialCatalogFoundation.services.test.ts` | 4 | PASS | Validate + in-memory rollback of plan and prices. |
| 3 | Commercial runtime | `subscriptionRuntimeEntitlement.enforcement.test.ts` | 10 | PASS | Bound live_plan; fail-closed; lifecycle overlays. |
| 4 | Subscription | `subscriptionAudit.test.ts`, `trial-and-webhook.test.ts` | 13+5 | PASS | Bind on admin/trial/webhook; no snapshot bind. |
| 5 | Entitlement | `subscriptionRuntimeEntitlement.guards.test.ts` | 5 | PASS | Hub → live plan / legacy bridge. |
| 6 | Pricing / public catalog | `commercialCatalogPublicPublishing.test.ts` (prior session) | — | PASS (prior) | Hidden live plans leave storefront. |
| 7 | Checkout / invoice | `admin-invoice-billing.test.ts`, `subscription-invoice-verification.test.ts` | 5+11 | PASS | Invoice model unchanged. Checkout still `subscription_plans`. |
| 8 | Renewal | code audit + bind `event: "renewal"` | n/a | **code PASS / DB not run** | Rebind captures current live price; no version publish. |
| 9 | Capability propagation | `commercialLivePlans.architectureAuthority.validation.test.ts` | 1 | PASS | A and B both get `kitchen` from live save; no version. |
| 10 | Plan edit atomicity | foundation services rollback tests | 2 | PASS (in-memory) | `updatePlan` still bypasses this path. |
| 11 | Cache invalidation | `saveLive` calls `invalidateEntitlementCache()` + public cache | n/a | **code PASS** | Default entitlement cache is opt-in (`useCache`); invalidation still correct. |
| 12 | Migration 0086 | SQL forensics | n/a | **BLOCKED** | See MIGRATION-0086-FORENSICS.md. Not applied. |
| 13 | Regression | `commercialProjectionGeneration.guards.test.ts` | 8 (1 fail) | **FAIL** | Seed file no longer contains `"ordering"` literal. |
| 14 | Locale | `en.json` / `ar.json` parse | n/a | PASS | JSON valid. |
| 15 | Production build | `npm run build` | n/a | **NOT RUN** | Typecheck failed; would not certify. |

Prior session (not re-run in full): commercial operational + UI guards 52+24 after leftover fixes.

---

## Non-blocking findings (do not expand this program)

- Discovery / Projection / Presentation **intact**.
- Owner expired-access incident: **unrelated** to versioning removal; do not fix here. Staging 0086 must not fail-close the owner binding.
- Checkout vs live catalog price dual SSOT: pre-existing; do not redesign checkout here.
- Leftover names: `snapshotLoader.ts`, `commercial_snapshot_*` events.

---

**STOP** — Do not commit, push, deploy, or apply `0086`. Await a repaired additive migration and the minimal API/CRS/fallback fixes above.
