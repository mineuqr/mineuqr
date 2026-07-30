# Commercial Eligibility Matrix

**Program:** CAPABILITY-DISCOVERY-PLATFORM-RECONSTRUCTION-1  
**Rule:** Eligibility is **derived from evidence**, never assumed from FEATURE_KEYS or marketing.

### Eligibility bar (ALL required)

| Gate | Requirement |
|------|-------------|
| G1 | Production implemented |
| G2 | Runtime available |
| G3 | UI available where applicable |
| G4 | API available where applicable |
| G5 | Stable ownership (not OWNER UNRESOLVED) |
| G6 | No architecture violation blocking sale |

Otherwise: **NOT COMMERCIAL READY**

---

## Matrix

| ID | Name | G1 | G2 | G3 | G4 | G5 | G6 | Result | Notes |
|----|------|----|----|----|----|----|----|--------|-------|
| CAP-01 | Order Write | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Internal AR; not a Plan toggle |
| CAP-02 | Order Read | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Internal read plane |
| CAP-03 | Ordering Platform | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | Guest enforcement present |
| CAP-04 | Ordering Client | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Presentation of CAP-03 |
| CAP-05 | Menu Catalog | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Core always-on; atomic FEATURE_KEYS invalid |
| CAP-06 | Table | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Core floor; QR packaging later |
| CAP-07 | Session | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Internal operational |
| CAP-08 | Check | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | Sellable settlement platform |
| CAP-09 | Order Settlement | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Specialization |
| CAP-10 | Split Payment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-11 | Multi-Check Allocation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-12 | Settlement Record | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Document plane |
| CAP-13 | Refund | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-15 | Document Identity | ✓ | ✓ | N/A | Emb | ✓ | ✓ | **NOT READY** | Standard |
| CAP-16 | CRMP | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-17 | Financial Shift | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | Package with CAP-16 |
| CAP-19 | Commercial Catalog | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Meta |
| CAP-20 | Snapshot Authority | ✓ | ✓ | Partial | ✓ | ✓ | ✓ | **NOT READY** | Enforcer |
| CAP-21 | Subscription | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Billing lifecycle |
| CAP-22 | Reporting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | API hard-gate residual (UI gates exist) |
| CAP-23 | Billing Providers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Integration |
| CAP-24 | Tenant Identity | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Infra |
| CAP-25 | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Infra |
| CAP-26 | Kitchen | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-27 | Printing | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-28 | Realtime | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | Prod flag dependency noted |
| CAP-29 | Devices | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-30 | Screens | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | With CAP-29 |
| CAP-31 | Waiter | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-32 | Kiosk | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-33 | Counter Pickup | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-34 | Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Channel/support |
| CAP-35 | Platform Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Internal |
| CAP-36 | Audit | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Internal |
| CAP-37 | DRAP | Partial | ✓ | Partial | Emb | ✓ | ✓ | **NOT READY** | Partial maturity |
| CAP-40 | Event Idempotency | ✓ | ✓ | N/A | N/A | ✓ | ✓ | **NOT READY** | Infra |
| CAP-41 | Storage | ✓ | ✓ | Indirect | Internal | ✓ | ✓ | **NOT READY** | Quota only |
| CAP-42 | Country/Currency | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Reference |
| CAP-43 | SaaS Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Admin |
| CAP-46 | Latency | ✓ | ✓ | Partial | Emb | ✓ | ✓ | **NOT READY** | Instrumentation |
| CAP-47 | Expo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **ELIGIBLE** | |
| CAP-48 | Tax Policy | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **NOT READY** | Config |

---

## Eligibility summary

| Class | Count | IDs |
|-------|------:|-----|
| **COMMERCIAL ELIGIBLE** | **17** | CAP-03, 08, 10, 11, 13, 16, 17, 22, 26, 27, 28, 29, 30, 31, 32, 33, 47 |
| **NOT COMMERCIAL READY** | **25** | remainder (42 − 17) |

### Projection implication

A future Commercial Registry **must not** equal the set of all Discovery capabilities.  
It **must** be a **projection** of the ELIGIBLE subset (plus optional packaging composition rules), never the legacy FEATURE_KEYS list.

### Contrast with Commercial Filter Registry (forensics)

| Plane | Ready count |
|-------|------------:|
| Legacy 18 FEATURE_KEYS forensic READY | **1** (`ordering` ≈ CAP-03) |
| Discovery ELIGIBLE (this reconstruction) | **17** |

This gap is the core architecture drift: platform has sellable capabilities Discovery can see; Commercial Registry does not project them.
