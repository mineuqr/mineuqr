# LEGACY-RETIREMENT-ASSESSMENT.md

**Program:** COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1  
**Date:** 2026-08-14

Legacy compatibility **must not** be a second commercial authority for bound standard plans. Today it still is for **unbound** subscribers.

## Remaining mechanisms

| Mechanism | Why it remains | Production used? | Affects standard plan entitlements? | Can override live plan? | Transitional? |
|-----------|----------------|------------------|--------------------------------------|-------------------------|---------------|
| `LEGACY_PLAN_BRIDGE` (30001/30002/30003 ↔ basic/professional/enterprise) | Payment + `user_subscriptions.planId` integer | Yes — bind, trial, webhooks | Maps to live plan id; does not freeze features | No, if bind succeeds | Yes — keep until checkout leaves `subscription_plans` |
| `planFeatureMatrix` | Unbound entitlement path + bootstrap seed of Projection IDs | Yes — unbound `resolveOwnerEntitlements`; bootstrap `listProjectionIdsForCommercialPlan` | **Yes for unbound** | **Yes — replaces live bundle** when no binding | Should shrink: bind all standard plans |
| `getCommercialEntitlementsFromContext` | Legacy bridge assembly | Yes — unbound only | Yes if unbound | Yes if unbound | Same |
| `subscription_plans` prices/limits | Checkout, invoices, unbound quota fallback | Yes | Limits if unbound; prices always for checkout | Quota yes if unbound | Separate financial alignment program |
| Legacy feature keys (`reports`, `qrMenu`, …) | Runtime `FEATURE_KEYS` expansion | Yes — expander maps aliases | Display/gates; bound features come from Projection IDs on the bundle | Cannot override included Projection keys | Transitional vocabulary |
| `OPS_EVENT.commercial_snapshot_*` | Audit taxonomy | Yes — bind audit | No | No | Rename later |
| `snapshotLoader.ts` filename | Historical | Import surface | No | No | Rename later |
| Version/snapshot **tables** | 0084/0085 production | Yes until 0086 | New code does not read them | N/A | **Keep until charged-term backfill proven** |

## Bootstrap

`persistentCatalogBootstrap.ts` seeds live plans from Projection IDs via `planFeatureMatrix` **once** when the durable catalog is empty. That is seed generation, not runtime entitlement. It does **not** publish versions.

## Rule

For **bound** standard plans, live bundle/limits win.  
For **unbound** standard plans, the matrix is still a second authority. Certification requires either: every production standard-plan subscriber has a binding after a **verified** backfill, or an explicit Architecture Authority exception.
