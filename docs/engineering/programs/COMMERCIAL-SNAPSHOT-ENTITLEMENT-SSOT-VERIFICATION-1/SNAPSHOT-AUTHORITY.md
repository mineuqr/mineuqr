# SNAPSHOT-AUTHORITY

**Program:** COMMERCIAL-SNAPSHOT-ENTITLEMENT-SSOT-VERIFICATION-1  

## Required invariant

> IF Commercial Snapshot exists THEN Snapshot is the **ONLY** source for Features, Limits, Billing Cycle, Pricing, Trial Policy, Promotion, Regional Policy.  
> No Catalog fallback. No Legacy fallback. No “prefer Snapshot”.

## Verification matrix (when binding + snapshot payload exist)

| Fact | Snapshot exclusive? | Evidence |
|------|---------------------|----------|
| Features | **NO** | R01 computes Legacy `FEATURE_MATRIX` first, then overlays Snapshot keys onto `base.features` |
| Limits (entitlement DTO) | **NO** | Overlay onto `base.limits`; missing limit keys keep Legacy values (`?? limits.*`) |
| Limits (quota enforcement) | **NO** | R12 never reads Snapshot |
| Billing Cycle | **NO** | Not taken from Snapshot in R01 |
| Pricing | **NO** | Not taken from Snapshot in R01; CRS may load Legacy `subscription_plans` |
| Trial Policy | **NO** | Trial status uses context dates + Legacy helpers; policy template not Snapshot-exclusive |
| Promotion | **NO** | Not applied from Snapshot in entitlement result |
| Regional Policy | **NO** | Not applied from Snapshot in entitlement result |
| Plan / status / flags | **NO** | Returned via `...base` from Legacy resolver |

## Forbidden patterns — findings

| Forbidden | Present? | Location |
|-----------|----------|----------|
| Reads Catalog after Snapshot exists (for entitlement) | Partial | Live Catalog not in R01 overlay; Catalog used for plan selection (R16) separately |
| Reads Legacy after Snapshot exists | **YES** | R01 always; R12 always; R11 fallback |
| Mixes Snapshot with Catalog | Selection paths only | R16 dual-read |
| Mixes Snapshot with Legacy | **YES** | R01 explicit overlay |
| Uses “prefer snapshot” instead of “snapshot authoritative” | **YES** | Comments + control flow in `getCommercialEntitlements.ts` |

## Snapshot helper (R05)

`resolveCommercialFactsFromSnapshot` itself returns Snapshot-only facts when binding exists (**A**).  
It is **not** wired as exclusive authority — only as an overlay input to R01.

## Persistence caveat (forensics)

R05 loads snapshot payload from **in-process** `commercialSnapshotService` store. If process restarts and hydrate misses snapshot rows, binding may exist in DB while payload is missing → R05 returns `missing` → **Legacy path executes even for “bound” subscriptions**. That amplifies non-exclusivity.
