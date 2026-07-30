# PUBLISHING_ARCHITECTURE.md — COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1

| Field | Value |
|-------|-------|
| **Amendment** | Revision 1 — **I-CPP-01** Published Catalog Isolation |
| **Registry** | [INVARIANT-REGISTRY.md](./INVARIANT-REGISTRY.md) |

---

## Authority map

```
┌─────────────────────────────────────────────────────────────┐
│ Commercial Catalog (SSOT for offerings + publishing)        │
│  Plan definitions · Publication lifecycle · Public visibility│
│  Version publication · CatalogPublishingService             │
└───────────────────────────┬─────────────────────────────────┘
                            │ publish immutable definitions
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ Published Catalog — read-only publication surface           │
│  Browse · Published metadata · Read-only projections        │
│  I-CPP-01: NEVER Runtime Authority · NEVER authz input      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Subscription Runtime — exclusive runtime authority          │
│  I-SRE-01 · I-SRE-02 · Feature/Limit/lifecycle/entitlement  │
│  Commercial Snapshot = sole runtime contract (I-CPL-13)     │
└─────────────────────────────────────────────────────────────┘
```

## Relationship

| Component | Role |
|-----------|------|
| Published Catalog | Read-only publication surface |
| Subscription Runtime | Exclusive runtime authority |
| Commercial Snapshot | Sole runtime contract |

---

## Responsibility matrix

| Plane | Owns | Must not own |
|-------|------|--------------|
| **Commercial Catalog** | Plan definitions · Publication lifecycle · Public visibility · Version publication | Runtime entitlement / authorization |
| **Published Catalog** | Public browsing · Published metadata · Read-only projections | Feature/Limit/lifecycle/eligibility evaluation; runtime authorization; consultation by authz paths (**I-CPP-01**) |
| **Subscription Runtime** | Feature authorization · Limit enforcement · Subscription lifecycle evaluation · Runtime entitlement resolution · Snapshot evaluation | Mutable Catalog as entitlement source; Published Catalog as authz input |

---

## Lifecycle

### Foundation (persisted, unchanged)

`draft → published → deprecated → retired`

### Governance overlay (in-process; no DB redesign)

| Overlay | Meaning |
|---------|---------|
| Approved | Draft cleared for schedule/publish governance |
| Scheduled | `scheduledEffectiveAt` in future; still foundation draft until publish |
| Archived | Applied only on Retired → publicly inaccessible |

### Resolved workflow state

`resolvePublicationWorkflowState(foundation + overlay)` →  
`draft | approved | scheduled | published | deprecated | retired | archived`

---

## Mandatory invariants

| ID | Rule | Enforcement |
|----|------|-------------|
| **I-CPP-01** | Published Catalog SHALL NEVER become a Runtime Authority; SHALL NOT evaluate Features/Limits/lifecycle/eligibility or resolve/be consulted for runtime authorization | Architecture Amendment Rev 1 · source isolation · no Runtime→Published Catalog authz path |
| Commercial Snapshot Invariant | Bound Snapshot permanently immutable; entitlements from Snapshot only | Unchanged; publishing does not write bindings |
| **I-CPL-13** | Exactly one active Snapshot; plan change → new Snapshot | Publishing never mutates snapshots |
| **I-SRE-01** | Runtime exclusive entitlement authority | Public/publishing modules do not import `subscription-runtime` enforcement APIs |
| **I-SRE-02** | Capability↔entitlement completeness | Out of scope; untouched |
| Runtime ≠ mutable Catalog | Runtime continues Snapshot-only | No new runtime→catalog entitlement path |

Official registry: [INVARIANT-REGISTRY.md](./INVARIANT-REGISTRY.md). Amendment: [ARCHITECTURE_AMENDMENT_REV1.md](./ARCHITECTURE_AMENDMENT_REV1.md).

---

## Scheduling

Supported via overlay + `publishing.applyDueSchedules` (admin). Not a foundation DB scheduler. Publish still executes through `PublicationService` (CC-16).

## Cache policy

Optional (`PUBLIC_CATALOG_CACHE=1`). Invalidate on publish/deprecate/retire/approve/schedule/archive. Cache **SHALL NOT** become SSOT — projection always regenerable from Catalog store. Cache **SHALL NOT** become a runtime authorization surface (**I-CPP-01**).
