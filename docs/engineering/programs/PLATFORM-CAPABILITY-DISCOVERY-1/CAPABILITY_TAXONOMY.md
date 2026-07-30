# CAPABILITY TAXONOMY

| Field | Value |
|-------|-------|
| **Program** | PLATFORM-CAPABILITY-DISCOVERY-1 |
| **Date** | 2026-07-30 |
| **Source** | [PLATFORM_CAPABILITY_CATALOG.md](./PLATFORM_CAPABILITY_CATALOG.md) |

Capabilities are grouped by primary business/architectural category. A capability may *touch* multiple categories; assignment is by **primary ownership**.

---

## Core Business

| ID | Capability |
|----|------------|
| CAP-01 | Order Platform |
| CAP-02 | Order Read Model |
| CAP-03 | Ordering Platform |
| CAP-05 | Menu & Restaurant Catalog |
| CAP-06 | Table Platform |
| CAP-07 | Operational Session |

---

## Commerce

| ID | Capability |
|----|------------|
| CAP-19 | Commercial Catalog |
| CAP-20 | Snapshot Entitlement Authority |
| CAP-21 | Subscription Platform |
| CAP-23 | SaaS Billing Providers |
| CAP-42 | Country & Currency Reference |
| CAP-43 | Commercial Analytics |

---

## Operations

| ID | Capability |
|----|------------|
| CAP-26 | Kitchen Display |
| CAP-27 | Printing Platform |
| CAP-29 | Device Management |
| CAP-30 | Screen Pairing & Operational Screens |
| CAP-31 | Waiter Ordering |
| CAP-35 | Platform Operations & Admin |
| CAP-39 | Operations Runtime Platform |

---

## Financial

| ID | Capability |
|----|------------|
| CAP-08 | Check / Financial Settlement |
| CAP-09 | Order Settlement |
| CAP-10 | Split Payment |
| CAP-11 | Multi-Check Allocation |
| CAP-12 | Settlement Record |
| CAP-13 | Refund Platform |
| CAP-14 | Financial Core Capabilities |
| CAP-16 | CRMP |
| CAP-17 | Financial Shift Lifecycle |
| CAP-18 | Financial Custody Plane |

---

## Reporting

| ID | Capability |
|----|------------|
| CAP-22 | Reporting Platform |

---

## Customer Experience

| ID | Capability |
|----|------------|
| CAP-04 | Ordering Client Platform |
| CAP-32 | Self-Ordering Kiosk |
| CAP-33 | Counter Pickup Ordering |
| CAP-34 | Customer Notifications & Push |

---

## Administration

| ID | Capability |
|----|------------|
| CAP-24 | Tenant Identity |
| CAP-25 | Auth & RBAC |
| CAP-35 | Platform Operations & Admin *(also Operations)* |
| CAP-43 | Commercial Analytics *(also Commerce)* |

---

## Infrastructure

| ID | Capability |
|----|------------|
| CAP-28 | Realtime Platform |
| CAP-40 | Event Delivery & Idempotency |
| CAP-41 | Media & Object Storage |
| CAP-37 | Data Retention & Archival |
| CAP-15 | Operational Document Identity |

---

## Platform Services

| ID | Capability |
|----|------------|
| CAP-44 | Architecture Governance |
| CAP-36 | Audit & Ops Taxonomy |
| CAP-42 | Country & Currency Reference *(also Commerce)* |

---

## Integration

| ID | Capability |
|----|------------|
| CAP-23 | SaaS Billing Providers *(also Commerce)* |
| CAP-34 | Customer Notifications & Push *(also CX)* |
| CAP-41 | Media & Object Storage *(Cloudflare R2)* |

---

## Artificial Intelligence

| ID | Capability |
|----|------------|
| CAP-45 | AI Assistant *(Planned)* |

---

## Security

| ID | Capability |
|----|------------|
| CAP-25 | Auth & RBAC *(also Administration)* |
| CAP-36 | Audit & Ops Taxonomy *(also Platform Services)* |

---

## Observability

| ID | Capability |
|----|------------|
| CAP-36 | Audit & Ops Taxonomy |
| CAP-38 | Performance Platform |
| CAP-46 | Order Lifecycle Latency |
| CAP-28 | Realtime Platform *(connectivity metrics SSOT for consumers)* |

---

## Cross-category notes

1. **Settlement vs Register:** Financial money truth is Settlement/Check; Register is custody — both under Financial taxonomy but different sovereign domains ([DOMAIN-AUTHORITY-MATRIX](../CROSS-DOMAIN-GOVERNANCE-1/DOMAIN-AUTHORITY-MATRIX.md)).
2. **Commercial Catalog vs Subscription:** Catalog owns offerings; Subscription owns lifecycle/entitlement runtime after bind.
3. **Reporting vs Commercial Analytics:** Restaurant KPI truth ≠ SaaS admin commercial analytics.
4. **Domain landscape diagram** (`docs/architecture/diagrams/domain-landscape.mmd`) still lists Session/Kitchen/Printing as Future — taxonomy above reflects **implemented** reality.
