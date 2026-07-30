# Commercial Projection Specification

**Program:** COMMERCIAL-PROJECTION-GENERATION-1

## Law

```
Discovery (ELIGIBLE)
        ↓
Packaging Policy (code)
        ↓
Commercial Projection Registry  ← Commercial SSOT
        ↓
Catalog / Plans / Published Offerings
        ↓
Subscription Runtime (Projection IDs + Legacy Compat)
```

Commercial Registry is **GENERATED**. No manual capability registration.

## Projection set (v1.0.0)

| Projection ID | Discovery Caps | Category |
|---------------|----------------|----------|
| `ordering` | CAP-03 | ordering |
| `checkManagement` | CAP-08 | settlement |
| `splitPayment` | CAP-10 | settlement |
| `multiCheckAllocation` | CAP-11 | settlement |
| `refund` | CAP-13 | settlement |
| `register` | CAP-16+17 | register |
| `reporting` | CAP-22 | reporting |
| `kitchen` | CAP-26 | ops_display |
| `printing` | CAP-27 | printing |
| `realtime` | CAP-28 | infrastructure |
| `devices` | CAP-29+30 | devices |
| `waiter` | CAP-31 | ordering |
| `kiosk` | CAP-32 | ordering |
| `counterPickup` | CAP-33 | ordering |
| `expo` | CAP-47 | ops_display |

**Count:** 15 projections from 17 ELIGIBLE Discovery capabilities (2 bundles).

## Record fields

See [Projection-Schema.md](./Projection-Schema.md).

## Consumers

| Plane | Vocabulary |
|-------|------------|
| Catalog Plan bundles | Projection IDs only (aliases normalized on write) |
| Published Offerings | Projection IDs only |
| Admin Plan UX | `COMMERCIAL_CAPABILITY_FILTER_KEYS` = Projection IDs |
| Runtime `hasFeature` / Snapshot map | Projection ∪ Legacy Compat |

## Invariants

1. Every Projection originates from Discovery ELIGIBLE.  
2. No orphan Projection (packaging must cover every ELIGIBLE CAP).  
3. NOT COMMERCIAL READY capabilities never enter Projection.  
4. Legacy FEATURE_KEYS are not Projection inputs.
