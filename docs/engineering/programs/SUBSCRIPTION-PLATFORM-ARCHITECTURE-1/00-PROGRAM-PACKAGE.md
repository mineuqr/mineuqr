# SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 |
| **Type** | Architecture Design |
| **Mode** | Architecture Authority |
| **Date** | 2026-07-29 |
| **Revision** | SP-17 · SP-18 · SP-19 · SP-20 · Plans Are Presentation / Features Are Contracts |
| **Prerequisites** | RBAC-PLATFORM-ARCHITECTURE-1 · TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1 |
| **Git** | Uncommitted docs only — no runtime / schema / API changes |
| **ADR-ARCH-036** | Recommended only — **not published** until final acceptance |

---

## Mission

Establish the **canonical Subscription Platform** for MineuQR — the Single Source of Truth for **commercial entitlement**: what capabilities a customer is entitled to use.

**Architecture only. No implementation.**

---

## Core Law

| Plane | Answers |
|-------|---------|
| **Tenant Identity** | **WHO** is the customer |
| **RBAC** | **WHO** may perform an action |
| **Subscription** | **WHAT** capabilities the customer is entitled to use |
| **Business Domains** | **HOW** the feature behaves |

These responsibilities must never overlap.

---

## Constraints (hard)

| Constraint | Status |
|------------|--------|
| Do NOT implement | Enforced |
| Do NOT modify runtime / APIs / UI | Enforced |
| Do NOT create migrations / schema | Enforced |
| Do NOT commit / push / deploy | Enforced |
| Out of scope: payment gateways, invoices, tax, accounting, AuthN/AuthZ, Identity, business domains, AI runtime | Enforced |

---

## Deliverables index

| # | Deliverable | Document |
|---|-------------|----------|
| 1 | Executive Summary | [FINAL-REPORT.md](./FINAL-REPORT.md) §1 |
| 2 | Architecture Overview | [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) |
| 3 | Subscription Ownership | [SUBSCRIPTION-OWNERSHIP.md](./SUBSCRIPTION-OWNERSHIP.md) |
| 4 | Plan Model | [PLAN-MODEL.md](./PLAN-MODEL.md) |
| 5 | Feature Catalog | [FEATURE-CATALOG.md](./FEATURE-CATALOG.md) |
| 6 | Entitlement Model | [ENTITLEMENT-MODEL.md](./ENTITLEMENT-MODEL.md) |
| 7 | Limit Model | [LIMIT-MODEL.md](./LIMIT-MODEL.md) |
| 8 | Lifecycle Model | [LIFECYCLE-MODEL.md](./LIFECYCLE-MODEL.md) |
| 9 | Trial Architecture | [TRIAL-ARCHITECTURE.md](./TRIAL-ARCHITECTURE.md) |
| 10 | Feature Enablement | [FEATURE-ENABLEMENT.md](./FEATURE-ENABLEMENT.md) |
| 11 | Governance Principles | [GOVERNANCE-PRINCIPLES.md](./GOVERNANCE-PRINCIPLES.md) |
| 12 | Compatibility | [COMPATIBILITY.md](./COMPATIBILITY.md) |
| 13 | ADR Recommendations | [ADR-RECOMMENDATIONS.md](./ADR-RECOMMENDATIONS.md) |
| 14 | Risk Assessment | [RISK-ASSESSMENT.md](./RISK-ASSESSMENT.md) |
| 15 | Future Roadmap | [FUTURE-ROADMAP.md](./FUTURE-ROADMAP.md) |

---

## Success criteria

| Criterion | Status |
|-----------|--------|
| Subscription ownership | Documented |
| Canonical plan model | Documented |
| Feature catalog | Documented |
| Entitlement model | Documented |
| Limit model | Documented |
| Lifecycle | Documented |
| Trial architecture | Documented |
| Feature enablement | Documented |
| Commercial governance | Documented |
| RBAC / Tenant Identity / AI compatibility | Documented |
| Future extensibility | Documented |
| SP-17 Feature Identity Stability | Documented |
| SP-18 Entitlement Snapshot | Documented |
| SP-19 Domain Subscription Independence | Documented |
| SP-20 Commercial Evolution | Documented |
| Plans Are Presentation / Features Are Contracts | Documented |
| ADR-036 references SP-17…20 + law | Documented (not published) |
| No implementation | Verified |

---

## Verdict target

**READY FOR ARCHITECTURE AUTHORITY FINAL REVIEW**
