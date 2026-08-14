# RUNTIME-VALIDATION.md

## Resolution path

Bound: Subscription → Current Live Plan → Current Capabilities.  
Unbound (all production subscriptions today): Legacy Bridge / `planFeatureMatrix` — **no catalog binding was created**.

`getCommercialEntitlements` delegates to Subscription Runtime (`resolveOwnerEntitlements`). There is no runtime read of:

- commercial snapshot
- commercial plan version
- publication state
- retirement state

Those tables are **absent** after 0086.

## Verified by tests (in-memory / mocked DB, not production mutation)

| Concern | Evidence |
|---------|----------|
| Live plan source `live_plan` | `commercialSnapshotRuntimeAuthority.test.ts` |
| Fail-closed when bound live plan cannot be read | same file + `subscriptionRuntimeEntitlement.enforcement.test.ts` |
| Plan limits | enforcement + bootstrap limits on production rows |
| CRS / mixed-resolution | runtime authority observability; mixed count 0 on live-plan path |
| Cache invalidation | `saveLive` → persist → `invalidatePublicCatalogCache` / catalog ready gate |

## Admin editor (Phase 6)

Required flow: Edit → Validate → Atomic Save → Cache Invalidation.

| Check | Result |
|-------|--------|
| `updatePlan` uses `planService.saveLive` | yes (`commercialCatalogRouter.ts`) |
| `saveLivePlan` mutation | present; UI uses it |
| publication action | **none** |
| draft state | **none** |
| version creation | **none** |
| retirement action | **none** |
| snapshot creation | **none** |

Production Professional was **not** mutated. Persistence of a capability edit was proven by TEST A/C (`saveLive` + reload of entitlements A/B + public catalog) rather than writing a test-only capability onto the production Professional plan.

## Phase 9 — capability propagation

No real customer subscribers exist. No production test subscribers were created.

TEST A/C: Professional subscribers A and B both receive a newly saved capability (`expo` on a new bundle) without snapshot, version, publication, or rebind.

## Owner runtime

Owner `600001` remains **unbound**. Expired-access P0 is unchanged and is **not** repaired here (`OWNER-SUBSCRIPTION-ACCESS-FORENSICS-1`).
