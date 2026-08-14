# RUNTIME-VALIDATION.md

Bound path (after a future bind):

`getCommercialEntitlements` → `resolveOwnerEntitlements` → `loadBoundLivePlan` → `resolveLivePlanCapabilities` → `resolveEntitlementsFromLivePlan`

Today production has **zero bindings**, so runtime still uses the unbound legacy bridge (`subscription_plans` + `planFeatureMatrix`). That bridge is **compatibility**, not catalog SSOT. This program did not bind owner `600001`.

## Changes in this program

- `updatePlan` API → `planService.saveLive` (validate + persist + cache invalidation).  
- Null `chargedAmount` on a binding **does not** substitute the current live list price.  
- `CommercialReadService` treats `live_plan` like the former snapshot source for display name.

## Unbound residual

Until subscribers are bound to live plans, standard-plan entitlements for existing rows still resolve through the legacy matrix. Binding is **not** performed here (would mutate subscription commercial state / create bindings against empty catalog before migrate).
