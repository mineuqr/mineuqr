# ARCHITECTURE GAP ANALYSIS

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Date** | 2026-07-30 |
| **Mode** | Observations only — **no implementation recommendations** |

---

## Missing ownership

| Observation | Evidence |
|-------------|----------|
| No prior platform-wide capability owner index | Discovery found distributed OWNERSHIP docs but no unified catalog |
| Menu/Restaurant production surface lacks peer ADR density vs Order/FSP | Core routers live; ADR Registry Order-centric |
| Commercial Analytics vs Reporting KPI ownership boundary informal | Separate routers (`analytics` vs `reporting`) without a cross-link constitution |
| Ops Runtime Platform vs Order outbox worker ownership unclear | Shared package claims runtime diagnostics; Order owns concrete outbox |

---

## Boundary ambiguity

| Observation | Evidence |
|-------------|----------|
| Order ↔ Session write coupling | ADR-010 events-only intent vs OPS session aggregate drift/fallback and historical dual-write notes (ADR-005) |
| Catalog ↔ Subscription dual commercial SSOT when unbound | Snapshot authority COMPLIANT when bound; legacy bridge otherwise |
| Settlement Platform plane vs Check write owner | Documented as dual-layer (DOMAIN-AUTHORITY-MATRIX) — clear in governance, easy to misread as overlap |
| Device Platform “must not own business entities” vs operational screens tightly UX-coupled | Ownership deny-lists exist; runtime coupling still high |
| Notifications spanning Order consumers and SaaS renewal email | Same `notification` namespace / push stack serving two concerns |

---

## SSOT ambiguity

| Observation | Evidence |
|-------------|----------|
| Three event planes without unified SSOT map | Order outbox domain events; `OPS_EVENT` taxonomy; `audit_events` dual-write |
| Domain landscape diagram outdated | `domain-landscape.mmd` marks Session/Kitchen/Printing Future while routers/consumers exist |
| ADR Implementation Status behind financial runtime | ADR-020/022/023/024/025 “Not implemented” while SR/Refund Implemented and routers live |
| Commercial Catalog constitutional ADR indexing | Engineering programs reference ADR-ARCH-037; not present in ADR-Registry table reviewed |
| Reporting constitutions ratified with “pending adoption” in architecture README | Runtime reporting exists alongside pending adoption labels |

---

## Aggregate overlap (claimed or risk)

| Observation | Evidence |
|-------------|----------|
| No second monetary Aggregate Root found as policy violation | ADR-020/023 deny lists; Check remains monetary AR |
| Payment / Allocation explicitly not ARs | ADR-024/025 |
| Soft overlap: dining session aggregates vs Order | Session aggregate readers + drift detection |
| Soft overlap: legacy `subscription_plans` vs `commercial_plans` | Parallel tables during adoption |

---

## Capability duplication

| Observation | Evidence |
|-------------|----------|
| Dual commercial plan tables | `subscription_plans` + `commercial_*` |
| Dual analytics concepts | Admin `analytics` vs restaurant `reporting` |
| Dual localization/currency concerns | Catalog regional policies + `countries_currencies` + reporting currency snapshots |
| Architecture “Future Kitchen/Print” vs live Kitchen/Print capabilities | Diagram vs code |

---

## Documentation gaps

| Observation | Evidence |
|-------------|----------|
| No AGENTS.md / root README architecture entry | Investigation |
| Capability catalog absent before this program | Investigation |
| Event catalog not consolidated | Three planes |
| Menu ownership matrix not peer to Commercial/Subscription OWNERSHIP.md density | Docs inventory |
| Tenant Identity runtime map fragmented across auth, classification, restaurant access | Architecture package + scattered runtime |

---

## Runtime inconsistencies (observed, not diagnosed as defects to fix)

| Observation | Evidence |
|-------------|----------|
| Entitlement path depends on binding state | Bound → Snapshot exclusive; unbound → Legacy |
| Session aggregate drift / reader fallback OPS events exist | `opsTaxonomy` SESSION-AGGREGATES block |
| CRMP settlement attribution fail-open by design | ADR-028/030 notes |
| ADR registry status fields not synchronized with later Implemented ADRs’ dependents | Registry table vs 026/032 Implemented |
| Domain landscape Future subgraph contradicts live `kitchen`, `print*`, `session` routers | `domain-landscape.mmd` vs `routers.ts` |

---

## Explicit non-actions

This document does **not**:

- Propose refactors, renames, or ADRs
- Assign remediation programs
- Change maturity certification decisions
- Assert production incidents

It records architectural observations for Architecture Authority review only.
