# ARCHITECTURE-AUTHORITY-REVIEW.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14  
**Reviewer:** Architecture Authority  
**Code commit/push/deploy:** none  
**Migration 0086:** written, **not applied**

---

## Verdict

**BLOCKED**

Live-plan capability resolution is implemented on the bound path and is not snapshot-frozen. That part of the product decision is real in code.

Certification is blocked because:

1. The new Drizzle schema and hydrate/persist paths **cannot run against the current production catalog schema** (0084/0085). Deploying this code before 0086 is a hard failure gate.
2. `0086` as written is **not safe to apply**: it drops version/snapshot tables in the same cutover, deletes unmatched bindings, and copies charged terms from unverified JSON. §14 of this review forbids dropping those structures until they are proven dead.
3. `commercialCatalog.updatePlan` still mutates live composition **without** validate → persist → cache invalidation.
4. Bound subscribers with a missing `chargedAmount` fall back to the **current live list price**, which can rewrite the current period’s commercial charged terms after a failed backfill.
5. Unbound standard-plan subscribers still resolve through `planFeatureMatrix` — a second commercial authority.

---

## What is true

| Claim | Evidence |
|-------|----------|
| Bound runtime is Subscription → Current Plan → Current Capabilities | `resolveOwnerEntitlements` → `loadBoundLivePlan` → `resolveLivePlanCapabilities` → live `featureBundleId` / `limitProfileId` |
| No `resolveEntitlementsFromSnapshot` / `CommercialSnapshotDefinition` in production TS | Grep: no matches |
| Publication pipeline files deleted | `catalogPublishingService.ts`, `publicationPersistence.ts` absent |
| Discovery → Projection → Presentation intact | Registries and generation tests still present; bootstrap seeds from Projection IDs |
| Invoice/payment models unchanged | `invoices` creation still from `subscription_plans`; invoice tests passed |
| Owner account pick still `restaurantId = 0` | `pickUserLevelSubscription` unchanged |

## What is not true

| Claim | Evidence |
|-------|----------|
| Atomic save is the only plan-edit path | `updatePlan` → `planService.update` skips validation, persist, and cache invalidation |
| 0086 is ready | Destructive DROP + DELETE bindings; code/schema already assume post-0086 |
| Charged period price is always isolated | `resolveLivePlanCapabilities` falls back to `chargedTermsForPlan` when binding amount is null |
| CRS is fully live-plan | `CommercialReadService` still keys display name on `"snapshot"` / `"snapshot_fail_closed"` |
| Typecheck / production build ready | `tsc --noEmit` exit 2; program UI files have new errors (`stateLabel`, wizard alert props) |

---

## Decision record

See [FINAL-ARCHITECTURE-DECISION.md](./FINAL-ARCHITECTURE-DECISION.md).
