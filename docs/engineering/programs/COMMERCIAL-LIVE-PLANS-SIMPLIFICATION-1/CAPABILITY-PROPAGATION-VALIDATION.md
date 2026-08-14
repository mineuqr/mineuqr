# CAPABILITY-PROPAGATION-VALIDATION.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14

## Required business test

Professional subscribers A and B must receive a newly included capability immediately, with:

- no subscription migration
- no snapshot recreation
- no rebind
- no publication
- no version creation

## What was run

File: `server/commercial-catalog/__tests__/commercialLivePlans.architectureAuthority.validation.test.ts`

| Test | Count | Result |
|------|-------|--------|
| subscribers A and B see a newly included capability without version or snapshot | 1 | **PASS** |

Method:

1. Seed live Professional with bundle (`ordering`, `reporting` included; `kitchen` excluded).
2. Resolve entitlements for A and B from the **same live bundle keys** (no version, no snapshot).
3. Create a new bundle including `kitchen`; `saveLive` points the plan at it (atomic in-memory save; persist skipped to avoid production DB).
4. Re-resolve A and B from the updated live plan composition.

Results: `kitchen` false → true for both; `commercialResolutionSource` is `live_plan`.

## Interpretation

The **store + resolver** path matches the approved policy: Subscription → Current Plan → Current Capabilities.

Limitation: `resolveLivePlanCapabilities` reads bindings **only from MySQL**. This review did not insert production binding rows. End-to-end DB propagation is code-path equivalent (same `planService.get` + included bundle features) but not executed against production.

## Admin edit path note

There is no `updateFeatureBundle` API. Adding a capability in production is: create a new bundle → `saveLivePlan` with new `featureBundleId`. That is still a live-plan edit, not a version publish.

**Bypass:** `updatePlan` can change `featureBundleId` in memory without persist/cache invalidation — see Architecture Authority review.
