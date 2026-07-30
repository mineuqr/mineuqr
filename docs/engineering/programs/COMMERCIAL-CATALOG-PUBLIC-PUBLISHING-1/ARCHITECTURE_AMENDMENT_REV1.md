# ARCHITECTURE AMENDMENT — Revision 1

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 |
| **Document** | ARCHITECTURE_AMENDMENT_REV1.md |
| **Mode** | Architecture Authority Amendment · Documentation Only |
| **Revision** | 1 |
| **Date** | 2026-07-30 |
| **Constraints** | No implementation · No runtime/API/DB/model/test changes · No commit · No push · No deploy |

---

## Authority decision

Architecture Authority adopts **I-CPP-01 — Published Catalog Isolation** as a formal architectural invariant of the Commercial Catalog Publishing Platform.

This amendment clarifies the permanent boundary between the **Published Catalog** (read-only publication surface) and the **Subscription Runtime** (exclusive runtime authority).

---

## New invariant

### I-CPP-01 — Published Catalog Isolation

**Published Catalog SHALL NEVER become a Runtime Authority.**

Specifically, Published Catalog SHALL NOT:

| Prohibited | Clarification |
|------------|---------------|
| Evaluate Feature entitlements | Discovery metadata ≠ authorization |
| Evaluate Limits | Quota decisions belong to Runtime |
| Evaluate Subscription lifecycle state | Lifecycle overlays are Runtime-owned |
| Evaluate Commercial eligibility | Eligibility for runtime access is Runtime + Snapshot |
| Resolve runtime authorization decisions | No allow/deny from Catalog projections |
| Be consulted by runtime authorization paths | Runtime MUST NOT import/call Published Catalog for authz |

Published Catalog SHALL remain a **read-only publication surface** whose responsibility is limited to exposing commercially published offerings (browse, published metadata, version visibility).

---

## Responsibility matrix

| Plane | Owns | Must not own |
|-------|------|--------------|
| **Commercial Catalog** | Plan definitions · Publication lifecycle · Public visibility · Version publication | Runtime entitlement / authorization |
| **Published Catalog** | Public browsing · Published metadata · Read-only projections | Feature/Limit/lifecycle/eligibility evaluation; runtime authz |
| **Subscription Runtime** | Feature authorization · Limit enforcement · Subscription lifecycle evaluation · Runtime entitlement resolution · Snapshot evaluation | Mutable Catalog as entitlement source; Published Catalog as authz input |

---

## Relationship

```
Published Catalog     →  Read-only publication surface
Subscription Runtime  →  Exclusive runtime authority (I-SRE-01)
Commercial Snapshot   →  Sole runtime contract (Snapshot Invariant · I-CPL-13)
```

**I-CPP-01** complements **I-SRE-01**: Runtime is exclusive authority; Published Catalog is explicitly forbidden from becoming an alternate authority or an input to authorization paths.

---

## Compliance validation (current implementation — unchanged)

Documentation-only confirmation against the existing COMMERCIAL-CATALOG-PUBLIC-PUBLISHING-1 implementation:

| Check | Result | Evidence |
|-------|--------|----------|
| Implementation already complies with I-CPP-01 | **COMPLIANT** | Public/publishing modules expose projections only; no entitlement APIs |
| No runtime path consults Published Catalog for authorization | **COMPLIANT** | `server/subscription-runtime` has zero references to `publicCatalog` / `listPublicCatalog` / `commercialCatalog.public` |
| Commercial Snapshot remains exclusive runtime source | **COMPLIANT** | Runtime Snapshot loader + EntitlementResolver; I-SRE-01 / I-CPL-13 unchanged |
| Published Catalog does not evaluate Features/Limits/lifecycle/eligibility | **COMPLIANT** | Read model builds browse DTOs; `assertPublicCatalogNotEntitlementAuthority()` marks non-participation |
| Source isolation guards | **COMPLIANT** | Publishing suite asserts no `subscription-runtime` enforcement imports; no `hasFeature` / `checkEntitlement` / `requireFeature` in publishing modules |

**Implementation remains unchanged by this amendment.**

---

## Official invariant registry

I-CPP-01 is registered in [INVARIANT-REGISTRY.md](./INVARIANT-REGISTRY.md).

---

## Updated documentation

| Document | Update |
|----------|--------|
| [INVARIANT-REGISTRY.md](./INVARIANT-REGISTRY.md) | Official registry entry for **I-CPP-01** |
| [PUBLISHING_ARCHITECTURE.md](./PUBLISHING_ARCHITECTURE.md) | Responsibility matrix · I-CPP-01 · relationship diagram |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Amendment Rev 1 · I-CPP-01 compliance · certification remains valid |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | Amendment Rev 1 · I-CPP-01 adopted |
| [00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md) | Index amendment + registry |

---

## Non-impact

| Surface | Impact |
|---------|--------|
| Runtime code | None |
| Public / publishing APIs | None |
| Database / commercial model | None |
| Tests | None |
| Production Certification (publishing + Runtime) | **Remains valid** |

---

## Success criteria

| Criterion | Met |
|-----------|-----|
| I-CPP-01 formally adopted | Yes |
| Implementation unchanged | Yes |
| Production Certification remains valid | Yes |

---

## STOP

Architecture Amendment Revision 1 complete. **END AMENDMENT**
