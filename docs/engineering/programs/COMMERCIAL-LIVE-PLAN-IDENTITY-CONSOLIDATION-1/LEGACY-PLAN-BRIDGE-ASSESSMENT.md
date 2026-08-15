# LEGACY-PLAN-BRIDGE-ASSESSMENT

## Verdict

**A. Still required.**

Not merely masking an obsolete comment. Runtime callers:

- `resolvePlanIdFromLegacyPlanId` / checkout offer
- `listPlansForSelectionLegacyShape` (`id: legacyPlanId`)
- `resolveLivePlanDisplayByLegacyId` / `isKnownLegacyPlanId`
- `resolveTrialPolicyFromCatalog` / trial fallback 30002
- `catalogPlanFromCode` unbound entitlements
- `classifyPlanTransitionEvent`
- Public catalog `legacyPlanId`
- Catalog bootstrap seed loop
- Deprecated admin statistics plan names

## Duplicate

`src/lib/commercial/planIdMapping.ts` repeats 30001–30003 → BASIC/PROFESSIONAL/ENTERPRISE.

## Preferred target

NO BRIDGE — **not proven safe** until integer APIs and `user_subscriptions.planId` are gone.

Do not move the bridge into Live Plan as a new table.
