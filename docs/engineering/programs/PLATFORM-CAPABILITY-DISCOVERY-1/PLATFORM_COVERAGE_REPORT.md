# PLATFORM COVERAGE REPORT

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Date** | 2026-07-30 |

---

## Completed capabilities (runtime + clear ownership)

Broadly live with identifiable owner/SSOT:

- Order write + outbox consumers (CAP-01, CAP-40, CAP-26, CAP-27, CAP-34)
- Ordering channels: table, waiter, kiosk (CAP-03, CAP-04, CAP-31, CAP-32)
- Menu/Restaurant/Table (CAP-05, CAP-06)
- Session (CAP-07)
- Settlement stack with SR + Refund certified scope (CAP-08–13)
- CRMP + shift (CAP-16, CAP-17)
- Commercial Catalog + snapshot authority + subscription/billing (CAP-19–21, CAP-23)
- Reporting APIs (CAP-22)
- Auth/Tenant/Admin/Ops (CAP-24, CAP-25, CAP-35, CAP-36)
- Realtime (CAP-28)
- Media, country/currency, commercial analytics, latency (CAP-41–43, CAP-46)
- Architecture governance docs (CAP-44)

---

## Partially adopted

| Capability | What’s partial |
|------------|----------------|
| CAP-15 Document Identity | Settlement adopted; Orders/Checks/Reporting/Printing/Notifications phased |
| CAP-16/17 CRMP/Shift | Strong domain/API/UI; custody plane specialization governance-only |
| CAP-19/21 Catalog↔Subscription | Bindings exist; unbound legacy bridge still present |
| CAP-22 Reporting | Runtime live; multiple constitutions “pending adoption” in arch README |
| CAP-27 Printing | Topology Partial; production validation pending (ADR-016) |
| CAP-01/07 Order↔Session | Event path + residual dual-write/session aggregate risks |
| CAP-37 DRAP | Shift adoption; no cold store/purge |
| CAP-29 Device | Runtime router exists; architecture maturity reserved language |
| CAP-20 Snapshot | Compliant when bound; legacy when unbound |

---

## Missing UI adoption (or thin UI)

| Capability | Observation |
|------------|-------------|
| CAP-33 Counter Pickup | Architecture clearer than dedicated product UI evidence vs kiosk/table |
| CAP-38 Performance Platform | Architecture/reserved; no rich product UI found |
| CAP-39 Ops Runtime Platform | Architecture package; not a first-class admin product surface |
| CAP-18 Custody Plane | Governance docs; no dedicated “custody” UI product |
| CAP-14 Financial Core | Language/constitution; UX via specialized settlement UIs |
| CAP-45 AI | No UI |

---

## Missing runtime adoption

| Capability | Observation |
|------------|-------------|
| CAP-45 AI Assistant | No LLM/runtime integration found |
| CAP-38 Performance | Largely architecture |
| CAP-39 Ops Runtime | Architecture vs concrete workers under Order outbox |
| CAP-37 Cold archive/purge | Explicitly not started (ADR-031) |

---

## Missing documentation

| Gap | Detail |
|-----|--------|
| Platform-wide capability catalog | **Did not exist** prior to this program (this package creates it) |
| Domain landscape diagram | Stale (Session/Kitchen/Printing still Future) |
| ADR Implementation Status | Lag for FSP ADRs 020–025 vs live routers |
| Menu Platform formal ownership ADR | Menu is production-critical but less ADR-indexed than Order/FSP |
| Tenant Identity runtime consolidation docs | Architecture package strong; runtime map scattered |
| Single event catalog | OPS taxonomy ≠ Order domain events ≠ audit events (three planes undocumented as one catalog) |
| Commercial Catalog ADR in constitutional registry | Programs cite ADR-037; not listed in ADR-Registry table in this investigation |

---

## Requiring hardening

| Capability | Hardening theme (observation) |
|------------|-------------------------------|
| CAP-01/07 | Session dual-write / aggregate drift OPS events |
| CAP-19/21 | Legacy unbound entitlement paths |
| CAP-27 | Production validation of distributed printing |
| CAP-22 | Constitution enforcement adoption |
| CAP-29/30 | Device/screen credential governance |
| CAP-37 | Cold archive/purge absence |
| CAP-08–11 | ADR registry status reconciliation |
| CAP-23 | Global payment readiness / provider expansion policy |

---

## Planned but not implemented

| Capability | Evidence |
|------------|----------|
| CAP-45 AI Assistant | Entitlement key reservation; future AI-OPERATIONS program reference |
| DRAP cold archive/purge | ADR-031 explicit |
| Full Document Identity consumer set | ADR-027 phased |
| Domain landscape “Future” items that are actually live | Documentation debt, not new builds |

---

## Coverage scorecard (investigative)

| Dimension | Assessment |
|-----------|------------|
| Core ordering path | High coverage |
| Financial settlement path | High coverage (with ADR doc lag) |
| Commercial SaaS path | High coverage (bridge complexity) |
| Reporting | High runtime / medium constitution adoption |
| Device/Performance/Runtime platforms | Medium–low productization |
| AI | None |
| Cross-platform documentation SSOT | **Improved by this catalog** (first platform-wide) |
