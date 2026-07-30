# COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 — Program Package

| Field | Value |
|-------|-------|
| **Program** | COMMERCIAL-PLAN-LIFECYCLE-EXPERIENCE-1 |
| **Mode** | Architecture Authority · Architecture Decision Only |
| **Date** | 2026-07-30 |
| **Prerequisites** | COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1 · SUBSCRIPTION-PLATFORM-ARCHITECTURE-1 · COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 · PLATFORM-CAPABILITY-DISCOVERY-1 (CAP-19/20/21) |
| **Constraints** | No implementation · No runtime/DB/schema/API · No commit · No push · No deploy · No billing/payment/checkout |

---

## Mission

Define the complete **Commercial Plan Lifecycle** as architecture SSOT for every commercial plan-related state and transition across Catalog, Snapshot, and Subscription — without ambiguity and without requiring Billing redesign.

## Dual-plane law (foundational)

| Plane | Owns states | Mutability |
|-------|-------------|------------|
| **A — Catalog Offering** | Plan Identity + Plan Version (+ governance gates) | Versions immutable after Published |
| **B — Subscription Instance** | Tenant commercial lifecycle | Mutable per Subscription SM |
| **C — Commercial Snapshot** | Immutable entitlement artifact | Never mutates after freeze |

Runtime entitlement **MUST** resolve from Plane C (bound) or documented legacy bridge (unbound) — never from mutable Catalog Draft data.

## Deliverables

| # | Document |
|---|----------|
| 1 | [COMMERCIAL_PLAN_LIFECYCLE.md](./COMMERCIAL_PLAN_LIFECYCLE.md) |
| 2 | [PLAN_TRANSITION_MATRIX.md](./PLAN_TRANSITION_MATRIX.md) |
| 3 | [COMMERCIAL_PLAN_STATE_MACHINE.md](./COMMERCIAL_PLAN_STATE_MACHINE.md) |
| 4 | [PLAN_VERSIONING_STRATEGY.md](./PLAN_VERSIONING_STRATEGY.md) |
| 5 | [COMMERCIAL_PLAN_GOVERNANCE.md](./COMMERCIAL_PLAN_GOVERNANCE.md) |
| 6 | [COMMERCIAL_PLAN_BOUNDARIES.md](./COMMERCIAL_PLAN_BOUNDARIES.md) |
| 7 | [ADR-COMMERCIAL-PLAN-LIFECYCLE.md](./ADR-COMMERCIAL-PLAN-LIFECYCLE.md) *(proposed)* |
| — | [FINAL-REPORT.md](./FINAL-REPORT.md) |

## Compatibility stance

- Preserves Catalog Plan Version core: `draft → published → deprecated → retired` (**CC-02**, **CC-16**).
- Extends with **governance pre-publish states** and **Archived** terminal without reopening immutability.
- Elevates Subscription architecture lifecycle (incl. Grace/Suspended) as canonical instance plane (runtime today is a subset — implementation OOS).
- Defines **Grandfathered** as Subscription commercial *mode*, not a Catalog Version state.
