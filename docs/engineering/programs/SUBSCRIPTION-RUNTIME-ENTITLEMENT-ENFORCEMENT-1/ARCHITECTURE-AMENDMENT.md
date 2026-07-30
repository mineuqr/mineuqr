# ARCHITECTURE AMENDMENT — Revision 1

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 |
| **Mode** | Architecture Authority Amendment · Documentation Only |
| **Revision** | 1 |
| **Date** | 2026-07-30 |
| **Constraints** | No implementation · No runtime/DB/API/test changes · No commit · No push · No deploy |

---

## Authority decision

Architecture Authority establishes a **permanent runtime governance rule**:

### Runtime Entitlement Access Rule

The **Subscription Runtime Platform SHALL be the exclusive authority** for every commercial entitlement decision.

No other component, service, domain, API, UI, middleware, or integration may independently determine commercial Features, Limits, or Runtime Entitlements.

---

## New governance rule

All commercial authorization MUST be performed exclusively through the **canonical Subscription Runtime interfaces**.

Runtime consumers MUST use the canonical Runtime Service.

### Consumers MUST NOT

| Prohibited | Reason |
|------------|--------|
| Read Commercial Snapshots directly | Snapshot facts are internal inputs to the Runtime, not a public entitlement API |
| Resolve entitlements from Commercial Catalog | Catalog is design-time only |
| Duplicate entitlement logic | Creates alternate decision engines |
| Implement local entitlement calculations | Violates exclusive authority |
| Cache entitlement decisions outside approved Runtime mechanisms | Stale/divergent authorization |
| Infer commercial capabilities from Subscription states alone | Lifecycle is an input; entitlements require Snapshot + resolver |

---

## Canonical Runtime interfaces

All entitlement decisions MUST flow through:

| Interface | Role |
|-----------|------|
| **SubscriptionRuntimeService** (`resolveOwnerEntitlements`) | Canonical runtime owner / hub |
| **EntitlementResolver** (`resolveEntitlementsFromSnapshot`) | Canonical Snapshot + lifecycle assembly |
| **`checkEntitlement()`** | Feature decision + reason/source |
| **`requireFeature()`** | Hard gate (throw on deny) |
| **`hasFeature()`** | Domain boolean gate |
| **`checkLimit()`** | Limit / quota decision |
| **`checkCapability()`** | Matrix → feature (approved companion) |

…or their **officially approved successors** (Architecture Authority only).

`getCommercialEntitlements` remains a **thin hub** that MUST delegate to SubscriptionRuntimeService — not a second decision engine.

---

## New invariant

### I-SRE-01 — Runtime Entitlement Authority

The Subscription Runtime Platform SHALL remain the **single authoritative runtime decision engine** for every commercial entitlement.

Every runtime authorization decision SHALL pass through the **canonical entitlement resolver**.

**No alternate runtime entitlement path may exist anywhere in the platform.**

---

## Updated documentation

| Document | Update |
|----------|--------|
| [RUNTIME_ARCHITECTURE.md](./RUNTIME_ARCHITECTURE.md) | Access rule, canonical interfaces, I-SRE-01, consumer prohibitions |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Governance compliance + I-SRE-01 |
| [ENTITLEMENT_MATRIX.md](./ENTITLEMENT_MATRIX.md) | Matrix as Runtime-owned mapping under I-SRE-01 |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Amendment Rev 1 + residual domain migration framed as I-SRE-01 compliance |
| [00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md) | Amendment deliverable index |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Amendment note |

**Not modified:** runtime code, tests, DB, APIs.

---

## Backward compatibility

| Concern | Assessment |
|---------|------------|
| Existing Subscription Runtime package | Unchanged; amendment **constitutionalizes** exclusive authority already implemented |
| Commercial Snapshot Invariant | ✓ Reinforced (consumers must not read Snapshots for decisions) |
| I-CPL-13 Snapshot Identity | ✓ Unchanged; Runtime loads active Snapshot internally |
| Catalog design-time ownership | ✓ Unchanged |
| Bound Snapshot → entitlements | ✓ Unchanged path inside Runtime |
| Thin hub `getCommercialEntitlements` | Compatible if it continues to **delegate only** |
| Residual coarse gates (`isSubscriptionActive`) | Documented as **non-compliant debt** to migrate to canonical APIs (follow-on; not implemented here) |

No schema, API surface, or behavior change in this amendment.

---

## Validation — non-violation check

| Constraint | Result |
|------------|--------|
| **Commercial Snapshot Invariant** | ✓ — Runtime remains sole consumer of bound Snapshot for entitlements; no consumer Snapshot reads |
| **I-CPL-13 Snapshot Identity** | ✓ — One active Snapshot; Runtime loader owns access |
| **SSOT** | ✓ — Catalog offerings · Subscription runtime decisions · Snapshot facts |
| **Aggregate Boundaries** | ✓ — Order/Check/Restaurant do not gain entitlement ownership |
| **Commercial Catalog ownership** | ✓ — Design-time only; no runtime entitlement from Catalog |
| **Subscription Runtime ownership** | ✓ — Strengthened as exclusive decision engine |
| **Capability Catalog governance** | ✓ — Matrix remains Runtime-owned mapping into feature/limit keys |

---

## Output status

Amendment Revision 1 documentation complete.

**STOP.**
