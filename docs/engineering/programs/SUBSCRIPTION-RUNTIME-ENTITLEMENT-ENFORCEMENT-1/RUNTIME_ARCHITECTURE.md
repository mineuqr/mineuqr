# RUNTIME ARCHITECTURE — SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1

| Field | Value |
|-------|-------|
| **Date** | 2026-07-30 |
| **Amendments** | Revision 1 — **I-SRE-01** · Revision 2 — **I-SRE-02** |

---

## Ownership

```
Commercial Catalog  → design-time offerings (capture-time only)
Subscription Runtime → EXCLUSIVE entitlement decisions (this package)
Bound Snapshot      → immutable commercial facts (Runtime-internal input)
Legacy Bridge        → unbound path inside Runtime only (not a consumer API)
```

---

## Runtime Entitlement Access Rule (constitutional)

The **Subscription Runtime Platform SHALL be the exclusive authority** for every commercial entitlement decision.

No other component, service, domain, API, UI, middleware, or integration may independently determine commercial Features, Limits, or Runtime Entitlements.

### Consumer prohibitions

Consumers MUST NOT:

- Read Commercial Snapshots directly  
- Resolve entitlements from Commercial Catalog  
- Duplicate entitlement logic  
- Implement local entitlement calculations  
- Cache entitlement decisions outside approved Runtime mechanisms  
- Infer commercial capabilities from Subscription states alone  

---

## Canonical Runtime interfaces

All entitlement decisions MUST flow through:

| Interface | Role |
|-----------|------|
| **SubscriptionRuntimeService** (`resolveOwnerEntitlements`) | Canonical runtime owner |
| **EntitlementResolver** (`resolveEntitlementsFromSnapshot`) | Canonical Snapshot + lifecycle assembly |
| **`checkEntitlement()`** | Feature decision + reason/source |
| **`requireFeature()`** | Hard gate |
| **`hasFeature()`** | Domain boolean gate |
| **`checkLimit()`** | Limit / quota decision |
| **`checkCapability()`** | Matrix → feature |

…or officially approved successors.

`getCommercialEntitlements` is a **delegating hub only** — not an alternate decision engine.

---

## Resolve flow (inside Runtime only)

```
ownerId
  → pickUserLevelSubscription
  → loadBoundCommercialSnapshot
       ├─ no binding → Legacy Bridge ONLY (within Runtime)
       ├─ binding + unreadable Snapshot → fail closed (deny)
       └─ binding + Snapshot
            → syncCommercialLifecycle(dbStatus + signals)
            → resolveEntitlementsFromSnapshot
            → optional approved Runtime cache
```

---

## Lifecycle synchronization

| DB status | Signals | Commercial lifecycle | Entitled? |
|-----------|---------|----------------------|-----------|
| trial (valid) | — | trial | Yes |
| active (valid) | — | active | Yes |
| active/expired (period ended) | graceUntil future | grace | Yes |
| * | suspended | suspended | No |
| canceled | — | cancelled | No |
| expired | — | expired | No |
| active | grandfathered | active + grandfathered mode | Yes (Snapshot unchanged) |

Grace/Suspended are architecture states projected via lifecycle signals (Billing-ready overlay). DB enum unchanged (no commercial model redesign).

Lifecycle state is an **input** to the resolver — never a substitute for entitlement evaluation.

---

## Enforcement API

| API | Use |
|-----|-----|
| `resolveOwnerEntitlements(ownerId)` | Full DTO (hub / CRS) |
| `hasFeature(ownerId, featureKey)` | Domain boolean gate |
| `checkEntitlement(...)` | Decision + reason/source/lifecycle |
| `requireFeature(...)` | Throw on deny |
| `checkLimit(...)` | Hard quota from Snapshot limits |
| `checkCapability(capabilityId)` | Matrix → feature check |

Domains MUST call these APIs — never evaluate plans, Catalog, or Snapshots directly.

---

## Invariants enforced

| ID | Statement |
|----|-----------|
| **I-SRE-01** | Subscription Runtime is the single authoritative runtime entitlement decision engine; every authorization passes through the canonical resolver; no alternate path |
| **I-SRE-02** | Every commercial capability has exactly one entitlement mapping and one Runtime enforcement point; no orphan capabilities/entitlements; no duplicate mappings; version-independent |
| **Commercial Snapshot Invariant** | Bound Snapshot immutable; no Catalog entitlement path |
| **I-CPL-13** | Exactly one active Snapshot; fail-closed; no mutate/repoint |
| **SSOT** | Offerings = Catalog · Decisions = Subscription Runtime · Facts = Snapshot |

### Completeness governance (I-SRE-02)

- Capability admission requires Entitlement Matrix row before platform exposure  
- Feature and Limit entitlements each own ≥1 capability  
- Consumers never bypass Runtime enforcement for matrix-listed capabilities  
