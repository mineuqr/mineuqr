# IMPLEMENTATION — SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1

**Date:** 2026-07-30  
**Status:** Implemented · **Architecture Authority Amendment Revision 1** (docs)  
**Amendment:** Runtime Entitlement Access Rule · **I-SRE-01** · Capability Enforcement Completeness · **I-SRE-02**

---

## What was implemented

| Component | Path | Role |
|-----------|------|------|
| Subscription Runtime Service | `server/subscription-runtime/subscriptionRuntimeService.ts` | Canonical owner of entitlement resolve |
| Snapshot Loader | `snapshotLoader.ts` | Loads bound immutable Snapshot only (Runtime-internal) |
| Entitlement Resolver | `entitlementResolver.ts` | Snapshot + lifecycle → entitlements |
| Lifecycle Sync | `lifecycleSync.ts` + `lifecycleOverlay.ts` | Trial/Active/Grace/Suspended/Expired/Cancelled + Grandfathered |
| Enforcement Layer | `enforcement.ts` | `hasFeature` / `checkEntitlement` / `requireFeature` / `checkLimit` / `checkCapability` |
| Capability Matrix | `capabilityMatrix.ts` | One capability → one entitlement key |
| Cache | `cache.ts` | Approved Runtime decision cache (opt-in) |
| Hub wire | `server/commercial/getCommercialEntitlements.ts` | Delegates to Runtime Service only |
| Guest ordering | `guestOrderingAuthority.ts` | Uses `hasFeature("ordering")` |

---

## Architecture compliance

| Law | Implementation |
|-----|----------------|
| **I-SRE-01** Runtime Entitlement Authority | Subscription Runtime is exclusive decision engine; canonical interfaces only |
| **I-SRE-02** Capability Enforcement Completeness | Canonical matrix: 18 features + 10 limits; no orphans/duplicates; coverage certified |
| Catalog = design-time | Bound path never reads mutable Catalog definitions |
| Subscription = runtime owner | `subscription-runtime` is sole resolver owner |
| Snapshot immutable after bind | Loader hydrates stored Snapshot only (not a consumer API) |
| I-CPL-13 | Exactly one active binding Snapshot id; fail-closed if unreadable |
| Entitlements from Snapshot only (bound) | `resolveEntitlementsFromSnapshot` inside Runtime |
| Unbound legacy | Legacy Bridge only **within** Runtime (not alternate consumer path) |

---

## Explicitly not implemented (out of scope)

Billing · Checkout · Invoices · Payment gateway · Pricing engine · Commercial UI · Catalog publishing · AI · DB enum expansion for grace/suspended (signals overlay used instead)
