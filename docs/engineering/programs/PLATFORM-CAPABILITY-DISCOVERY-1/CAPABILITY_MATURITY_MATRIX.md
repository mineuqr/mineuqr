# CAPABILITY MATURITY MATRIX

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Date** | 2026-07-30 |

## Classification scale (investigation)

| Class | Meaning |
|-------|---------|
| **Experimental** | Architecture packages / reserved surfaces; little or no product runtime |
| **Development** | Partial runtime or architecture-strong with incomplete adoption |
| **Production Ready** | Live product path with known hardening/ADR lag |
| **Production Certified** | Strong program/ADR “Implemented/Certified” evidence for the capability scope |
| **Deprecated** | Explicitly retired (none cataloged as whole-capability deprecated in this pass) |
| **Planned** | Documented intent; no runtime |

> Catalog `Certified` entries often map here to **Production Certified** *for architecture/domain scope*, not necessarily board Production Certification for the whole product.

---

## Matrix

| ID | Capability | Maturity | Evidence |
|----|------------|----------|----------|
| CAP-01 | Order Platform | Production Ready | Live `order.*`, outbox, consumers; ADR-001/007 registry still Partial/Not implemented historically |
| CAP-02 | Order Read Model | Production Ready | `order_read_*`, ORDERS-READ-MODEL programs, `order.read` |
| CAP-03 | Ordering Platform | Production Ready | `ordering.*`, shared ordering-platform, multi-channel live |
| CAP-04 | Ordering Client | Production Certified | ADR-018 Accepted + Implemented + governed identity |
| CAP-05 | Menu & Restaurant | Production Ready | Core routers + public menu; limited formal Menu ADR maturity |
| CAP-06 | Table Platform | Production Ready | `table.*`, table programs, live floor |
| CAP-07 | Operational Session | Production Ready | `session.*`, operational-session shared; diagram still “Future” |
| CAP-08 | Check Settlement | Production Ready | Live check/settlement APIs; ADR-020/022 Implementation Status lag vs SR/Refund stack |
| CAP-09 | Order Settlement | Production Ready | `orderSettlement.*` present |
| CAP-10 | Split Payment | Production Ready | `splitPayment.*` + domain modules; ADR-024 status lag |
| CAP-11 | Multi-Check Allocation | Production Ready | `multiCheckAllocation.*`; ADR-025 status lag |
| CAP-12 | Settlement Record | Production Certified | ADR-026 Implemented (write + refund + Reporting Net) |
| CAP-13 | Refund | Production Certified | ADR-032 Implemented full stack |
| CAP-14 | Financial Core Language | Production Certified | ADR-023 Accepted constitution; registry “Not implemented” inconsistent with dependents |
| CAP-15 | Document Identity | Development | ADR-027 Partial; Settlement adopted; others phased |
| CAP-16 | CRMP | Production Certified | ADR-028 Partial→domain+API+UI+refund attribution certified language |
| CAP-17 | Financial Shift | Production Certified | ADR-030 domain certified; some API/UI notes partial |
| CAP-18 | Custody Plane | Production Certified | ADR-033 governance only Accepted |
| CAP-19 | Commercial Catalog | Production Ready | Foundation+adoption+UI+localization; migrations 0084/0085 readiness language |
| CAP-20 | Snapshot Authority | Production Certified | COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1 COMPLIANT |
| CAP-21 | Subscription | Production Ready | Live billing/subscription; Catalog bridge evolving |
| CAP-22 | Reporting | Production Ready | Live `reporting.*`; constitutions ratified, adoption pending notes in arch README |
| CAP-23 | Billing Providers | Production Ready | PayPal/Tap + webhooks live |
| CAP-24 | Tenant Identity | Production Ready | Runtime access + architecture SSOT package |
| CAP-25 | Auth & RBAC | Production Ready | auth-local + protected procedures live |
| CAP-26 | Kitchen | Production Ready | `kitchen.*` + Order consumers |
| CAP-27 | Printing | Production Ready | ADR-016 Partial; catalog ADR-017 Implemented |
| CAP-28 | Realtime | Production Ready | Production enablement program; live `realtime.*` |
| CAP-29 | Device Management | Development | Shared ownership mature; maturity language architecture/reserved |
| CAP-30 | Screen Pairing | Production Ready | Pairing OPS events + screen clients |
| CAP-31 | Waiter | Production Ready | `waiter.*` + waiter pages |
| CAP-32 | Kiosk | Production Ready | Kiosk routes + ADR identity |
| CAP-33 | Counter Pickup | Development | Architecture program; UI adoption less evidenced than kiosk/table |
| CAP-34 | Notifications & Push | Production Ready | web-push + notification router + consumers |
| CAP-35 | Platform Ops Admin | Production Ready | Live admin/ops; PLATFORM-P0 Live nav honesty |
| CAP-36 | Audit & Ops Taxonomy | Production Ready | opsTaxonomy + audit_events + Events UI |
| CAP-37 | DRAP | Development | ADR-031 Partial; cold archive/purge not started |
| CAP-38 | Performance Platform | Experimental | Shared architecture; implementation pending |
| CAP-39 | Ops Runtime Platform | Experimental | Shared architecture; overlaps outbox practice |
| CAP-40 | Event Idempotency | Production Certified | ADR-014 Implemented; ADR-021 Partial |
| CAP-41 | Media Storage | Production Ready | R2 provider in use |
| CAP-42 | Country Currency | Production Ready | Router + table |
| CAP-43 | Commercial Analytics | Production Ready | `analytics.*` Live |
| CAP-44 | Architecture Governance | Production Certified | ADR-013 Implemented (governance) |
| CAP-45 | AI Assistant | Planned | Entitlement keys only; no runtime AI |
| CAP-46 | Order Latency | Production Ready | shared package + OPS instrumentation |

---

## Counts

| Maturity | Count |
|----------|------:|
| Experimental | 2 |
| Development | 4 |
| Production Ready | 27 |
| Production Certified | 12 |
| Deprecated | 0 |
| Planned | 1 |
| **Total** | **46** |

---

## Evidence caveats

1. **ADR Implementation Status** in `ADR-Registry.md` is **behind** several live financial routers (020/022/023/024/025 marked Not implemented while CAP-12/13 and routers exist). Maturity here prefers **runtime + later ADR notes** for those rows, and flags registry lag in gap analysis.
2. **Architecture Certified ≠ Product Live** for some UI foundations (e.g. Subscription UI Foundation).
3. **Production migration readiness** (0084/0085) is not the same as full Production Certification Board completion.
