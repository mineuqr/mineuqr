# FINAL REPORT — SUBSCRIPTION-PLATFORM-ARCHITECTURE-1

**Date:** 2026-07-29  
**Status:** READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW  
**Type:** Architecture Design · Architecture Authority mode  
**Revision:** SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts  
**Constraints:** Architecture only · No implementation · No runtime/API/UI/schema/migration changes · No commit / push / deploy · **ADR-ARCH-036 not published**  
**Prerequisites:** RBAC-PLATFORM-ARCHITECTURE-1 · TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1  

---

## 1. Executive Summary

MineuQR now has a **canonical Subscription Platform architecture**: the commercial entitlement SSOT for plans, features, limits, trials, lifecycle, and server-authoritative entitlement evaluation.

**Core Law:** Tenant Identity = WHO the customer is · RBAC = WHO may act · Subscription = WHAT is entitled · Domains = HOW features behave.

**Canonical commercial law:** **Plans Are Presentation. Features Are Contracts.**

**Constitutional additions (this revision):**

| ID | Principle | One-line law |
|----|-----------|--------------|
| **SP-17** | Feature Identity Stability | Feature Keys immutable; never rename/reuse/change semantics; deprecate |
| **SP-18** | Entitlement Snapshot | Long-running ops may freeze entitlement at start; mid-flight changes must not alter them |
| **SP-19** | Domain Subscription Independence | Domains never evaluate Plans; `hasFeature` only |
| **SP-20** | Commercial Evolution | Plans replaceable; Features permanent; evolution without Feature redesign |

Runtime commercial behavior is **unchanged** by this program.

---

## 2. Architecture Overview

```
Canonical Tenant ID (Identity)
        → Subscription instance (lifecycle / trial)
        → Entitlement evaluator (features + limits [+ snapshot])
        → Domains / AI  ∩  RBAC authorize
```

Details: [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md).

---

## 3–10. Model summaries

| Area | Doc |
|------|-----|
| Ownership | [SUBSCRIPTION-OWNERSHIP.md](./SUBSCRIPTION-OWNERSHIP.md) |
| Plans (packaging) | [PLAN-MODEL.md](./PLAN-MODEL.md) |
| Features (contracts) | [FEATURE-CATALOG.md](./FEATURE-CATALOG.md) |
| Entitlement + snapshot | [ENTITLEMENT-MODEL.md](./ENTITLEMENT-MODEL.md) |
| Limits | [LIMIT-MODEL.md](./LIMIT-MODEL.md) |
| Lifecycle | [LIFECYCLE-MODEL.md](./LIFECYCLE-MODEL.md) |
| Trials | [TRIAL-ARCHITECTURE.md](./TRIAL-ARCHITECTURE.md) |
| Enablement | [FEATURE-ENABLEMENT.md](./FEATURE-ENABLEMENT.md) |

---

## 11. Governance Principles

**SP-01…SP-20** plus canonical law **Plans Are Presentation. Features Are Contracts.**

Details: [GOVERNANCE-PRINCIPLES.md](./GOVERNANCE-PRINCIPLES.md).

---

## 12. Compatibility Analysis

| Plane | Law |
|-------|-----|
| **RBAC** | Entitled ∧ Authorized; domains never plan-switch |
| **Tenant Identity** | Attach to Canonical Tenant ID; packaging ≠ identity |
| **AI** | Stable feature keys; limits; optional job snapshots; no plan branching |

Details: [COMPATIBILITY.md](./COMPATIBILITY.md).

---

## 13. ADR Recommendations

Recommend **ADR-ARCH-036** with **SP-17 · SP-18 · SP-19 · SP-20** and **Plans Are Presentation. Features Are Contracts.** as mandatory.

**Not published** — await Architecture Authority final acceptance.

Details: [ADR-RECOMMENDATIONS.md](./ADR-RECOMMENDATIONS.md).

---

## 14–15. Risk · Roadmap

See [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) · [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md).

---

## Revision validation

| Check | ✓ |
|-------|---|
| Feature Keys immutable commercial contracts | ✓ |
| Never renamed or reused | ✓ |
| Deprecated keys historically valid | ✓ |
| Long-running ops may snapshot entitlements | ✓ |
| Subscription changes never alter running snapshotted ops | ✓ |
| Domains never evaluate Plans | ✓ |
| Domains evaluate Feature Entitlements only | ✓ |
| Plans replaceable; Feature Catalog outlives Plans | ✓ |
| Plans Are Presentation; Features Are Contracts | ✓ |
| No contradictions across documents | ✓ |

---

## Success criteria verification

| Criterion | ✓ |
|-----------|---|
| Subscription ownership / plan / feature / entitlement / limit / lifecycle / trial / enablement | ✓ |
| Commercial governance | ✓ |
| RBAC / Tenant Identity / AI compatibility | ✓ |
| Future extensibility | ✓ |
| **SP-17 documented** | ✓ |
| **SP-18 documented** | ✓ |
| **SP-19 documented** | ✓ |
| **SP-20 documented** | ✓ |
| Canonical commercial law documented | ✓ |
| ADR-036 recommendation updated | ✓ |
| All affected documents updated | ✓ |
| No implementation | ✓ |
| ADR-ARCH-036 not published | ✓ |

---

## Package index

[00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md)

---

## Final verdict

# READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW

Documentation revision only.  
No runtime changes.  
No code changes.  
No schema changes.  
No migrations.  
No commits.  
No deployment.

**Await Architecture Authority final acceptance before ADR-ARCH-036 publication or any Foundation program.**
