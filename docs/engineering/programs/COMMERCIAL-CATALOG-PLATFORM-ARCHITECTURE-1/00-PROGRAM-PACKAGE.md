# COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1 |
| **Type** | Platform Architecture |
| **Mode** | Architecture Authority |
| **Date** | 2026-07-29 |
| **Revision** | CC-13 · CC-14 · CC-15 · CC-16 (Architecture Authority amendments) |
| **Prerequisites** | SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 · TENANT-IDENTITY-PLATFORM-ARCHITECTURE-1 · RBAC-PLATFORM-ARCHITECTURE-1 |
| **Git** | Uncommitted docs only — no runtime / schema / API changes |
| **ADR-ARCH-037** | Recommended only — **not published** until final certification |

---

## Mission

Establish the **canonical Commercial Catalog Platform** — the Single Source of Truth for every commercial offering in MineuQR: Plan Identity, Plan Versions, Pricing, Billing Cycles, Feature Bundles, Limit Profiles, Trials, Promotions, Migration Policies, and Retirement Policies.

**Architecture only. No implementation.**

---

## Core Law (binding order)

```
Plan Identity → Plan Version → Pricing / Cycles / Bundles / Limits
                                      ↓
                              Subscription (consumer)
```

**Never:** Subscription → invents Plan.  
Subscriptions bind to **Plan Version**, not bare Plan Identity.

---

## Relationship to Subscription Platform

| Concern | Owner |
|---------|-------|
| Plan Identity, Versions, Pricing, Catalog policies | **Commercial Catalog Platform** |
| Subscription instance, entitlement evaluation, customer lifecycle | **Subscription Platform** (consumes Catalog) |
| Who may manage catalog / subscription tools | **RBAC** |
| Who the customer is | **Tenant Identity** |

This program **refines** Subscription architecture ownership: catalog SSOT moves here; Subscription remains entitlement runtime SSOT (future Foundations respect this boundary).

---

## Constraints (hard)

| Constraint | Status |
|------------|--------|
| Do NOT implement runtime | Enforced |
| Do NOT implement payments / billing providers | Enforced |
| Do NOT implement subscriptions | Enforced |
| Do NOT create migrations / schema | Enforced |
| Do NOT commit / push / deploy | Enforced |

---

## Deliverables index

| # | Deliverable | Document |
|---|-------------|----------|
| 1 | Executive Summary | [FINAL-REPORT.md](./FINAL-REPORT.md) §1 |
| 2 | Architecture Overview | [ARCHITECTURE-OVERVIEW.md](./ARCHITECTURE-OVERVIEW.md) |
| 3 | Domain Ownership | [DOMAIN-OWNERSHIP.md](./DOMAIN-OWNERSHIP.md) |
| 4 | Plan Identity & Version Model | [PLAN-AND-VERSION-MODEL.md](./PLAN-AND-VERSION-MODEL.md) |
| 5 | Pricing & Billing Cycles | [PRICING-AND-CYCLES.md](./PRICING-AND-CYCLES.md) |
| 6 | Feature & Limit Catalogs | [FEATURE-AND-LIMIT-CATALOGS.md](./FEATURE-AND-LIMIT-CATALOGS.md) |
| 7 | Lifecycle & State Machines | [LIFECYCLE-AND-STATE-MACHINES.md](./LIFECYCLE-AND-STATE-MACHINES.md) |
| 8 | Migration & Retirement | [MIGRATION-AND-RETIREMENT.md](./MIGRATION-AND-RETIREMENT.md) |
| 9 | Promotions | [PROMOTION-PLATFORM.md](./PROMOTION-PLATFORM.md) |
| 10 | Governance Laws CC-01…CC-16 | [GOVERNANCE-LAWS.md](./GOVERNANCE-LAWS.md) |
| 11 | Sequences & Aggregate Boundaries | [AGGREGATES-AND-SEQUENCES.md](./AGGREGATES-AND-SEQUENCES.md) |
| 12 | Commercial Snapshot (CC-13) | [COMMERCIAL-SNAPSHOT.md](./COMMERCIAL-SNAPSHOT.md) |
| 13 | Regional Policies (CC-15) | [REGIONAL-POLICIES.md](./REGIONAL-POLICIES.md) |
| 14 | Compatibility | [COMPATIBILITY.md](./COMPATIBILITY.md) |
| 15 | ADR Recommendations | [ADR-RECOMMENDATIONS.md](./ADR-RECOMMENDATIONS.md) |
| 16 | Risk Analysis | [RISK-ANALYSIS.md](./RISK-ANALYSIS.md) |
| 17 | Future Expansion | [FUTURE-EXPANSION.md](./FUTURE-EXPANSION.md) |
| 18 | Production Readiness Assessment | [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) |

---

## Verdict target

**READY FOR FINAL ARCHITECTURE AUTHORITY REVIEW**
