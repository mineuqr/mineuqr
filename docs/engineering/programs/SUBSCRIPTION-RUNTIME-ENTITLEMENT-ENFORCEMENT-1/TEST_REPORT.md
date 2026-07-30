# TEST REPORT — SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1

**Date:** 2026-07-30

## Suites

| Suite | Result |
|-------|--------|
| `subscriptionRuntimeEntitlement.enforcement.test.ts` | Pass |
| `subscriptionRuntimeEntitlement.guards.test.ts` | Pass |
| `guestOrderingAuthority.test.ts` | Pass |
| `commercialSnapshotRuntimeAuthority.test.ts` | Pass |

**Total (targeted run):** 25/25 passed

## Coverage mapped to requirements

| Scenario | Covered |
|----------|---------|
| Active | ✓ |
| Trial | ✓ |
| Grace | ✓ |
| Expired | ✓ |
| Suspended | ✓ |
| Cancelled | ✓ |
| Grandfathered | ✓ |
| Snapshot bound resolve | ✓ |
| Snapshot unreadable fail-closed | ✓ |
| Illegal / unknown capability | ✓ (matrix) |
| Limit within / exceeded | ✓ |
| Architecture guards (no Catalog matrix import, hub delegate) | ✓ |

## Snapshot migration

Plan-change Snapshot supersession remains owned by Catalog adoption bind APIs (`createImmutableCommercialSnapshotForSubscription`). Runtime consumes the **active** binding only (I-CPL-13). Historical Snapshots are not mutated by the resolver.
