# FINAL-REPORT.md — COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1

**Date:** 2026-08-15  
**Verdict:** **READY FOR ARCHITECTURE AUTHORITY REVIEW**

This program does **not** authorize commit, push, or production deployment. Await Architecture Authority review.

---

## 1. Root cause

Limits already lived on Live Plans (`commercial_limit_values`, key `restaurants`). The editor showed a profile name, not editable values. `saveLive` persisted `limitProfileId` only. Restaurant create used a parallel quota path and skipped enforcement for `role === admin`.

## 2. Owning layer

**UI + `saveLive` persistence + runtime quota adapter.** Not schema. Not pricing. Not Owner Access Mode.

## 3. Files changed (application)

- `client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx`
- `client/src/components/admin/platform-ops/commercial-catalog/experience/LivePlanLimitsEditor.tsx` (new)
- `client/src/components/admin/platform-ops/commercial-catalog/experience/__tests__/livePlanLimitsEditor.test.ts` (new)
- `client/src/locales/en.json` / `ar.json`
- `server/api/commercialCatalog/commercialCatalogRouter.ts`
- `server/services/commercial-catalog/index.ts`
- `server/services/commercial-catalog/livePlanPersistence.ts`
- `server/subscriptionPlanLimits.ts`
- `server/subscriptionPlanLimits.test.ts`
- `server/routers.ts` (always `assertRestaurantCreateAllowed(ownerUserId)`)
- `server/commercial/CommercialReadService.parity.test.ts` (NONE → 0)
- `shared/commercial-catalog/contracts/livePlanLimits.ts` (new)
- `shared/commercial-catalog/contracts/index.ts`
- `server/commercial-catalog/__tests__/commercialLivePlans.limits.repair.test.ts` (new)
- `docs/engineering/programs/COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1/` (this package)

## 4. Database changes

**None.** No migration. No production writes. No catalog wipe. Current values 1 / 5 / `null` preserved until an administrator saves a change.

## 5. Why no migration

0086 already has `commercial_limit_profiles` / `commercial_limit_values`. The defect was editor + persist-by-profile-id + competing runtime quota.

## 6. Editor behavior

Select plan → load persisted restaurants / categories / items → Limited integer or Unlimited (`null`) → validate → `saveLive` replaces profile values atomically → caches invalidated.

## 7. Runtime behavior

Bound Live Plan customers: hub `checkLimit` on canonical `restaurants`. Customer admin cannot skip. FULL_PLATFORM unlimited. SIMULATED_PLAN uses the selected Live Plan’s current limits. FROZEN still denies create. NONE does not fall back to Basic 1.

## 8. Legacy isolation

`PLAN_LIMITS` and `subscription_plans.maxRestaurants` remain for Legacy Bridge / checkout compatibility. They are not the Live Plan customer create-quota authority.

## 9. Build / tests

| Gate | Result |
|------|--------|
| `pnpm build` | **PASS** |
| `pnpm check` | **184** `error TS*` — repo baseline (MapIterator `downlevelIteration`, kiosk, design-system, reporting). **No new errors** in Limits editor, contracts, `subscriptionPlanLimits`, or router. Pre-existing `TS2802` in catalog services unchanged in kind. |
| Limits + hub + editor + owner + Frozen + capability-editor suites | **PASS** |

See [REGRESSION-VALIDATION.md](./REGRESSION-VALIDATION.md) and [LIMIT-TEST-MATRIX.md](./LIMIT-TEST-MATRIX.md).

## 10. Residuals

1. Constitution v1.0 does not yet name Limits/Quotas as a first-class CE rule. Follow-on governance recommended ([GOVERNANCE-COMPLIANCE.md](./GOVERNANCE-COMPLIANCE.md)).
2. Legacy plan DTO still uses `restaurants ?? 1` for listing compatibility. Isolated from `checkLimit`.
3. `routers.test.ts` / `restaurant-profile-verification.test.ts` Frozen-gate mock gaps (pre-existing).

## 11. Checklist

- [x] Limits visible in Plan Editor
- [x] Limits editable manually
- [x] Current values preserved
- [x] Unlimited supported (`null`)
- [x] Validation implemented
- [x] Atomic save implemented
- [x] Runtime uses Live Plan limits
- [x] Legacy quota sources isolated from runtime
- [x] Restaurant creation enforced server-side
- [x] Customer admin cannot bypass
- [x] Owner FULL_PLATFORM unlimited
- [x] Owner simulation respects selected plan
- [x] FROZEN denies creation
- [x] Cache invalidation verified
- [x] Negative tests pass
- [x] Regression tests pass (in-scope)
- [x] Build passes
- [x] No new errors in changed files
- [x] Documentation complete
- [x] No production destructive changes

**STOP.** Await Architecture Authority review.
