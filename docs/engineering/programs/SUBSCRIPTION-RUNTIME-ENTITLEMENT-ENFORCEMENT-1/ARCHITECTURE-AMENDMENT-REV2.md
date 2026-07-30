# ARCHITECTURE AMENDMENT — Revision 2

| Field | Value |
|-------|-------|
| **Program** | SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1 |
| **Mode** | Architecture Authority Amendment · Documentation Only |
| **Revision** | 2 |
| **Date** | 2026-07-30 |
| **Prereq** | Amendment Revision 1 (**I-SRE-01**) |
| **Constraints** | No implementation · No runtime/DB/API/test changes · No commit · No push · No deploy |

---

## Authority decision

Architecture Authority adds a permanent completeness invariant:

### I-SRE-02 — Capability Enforcement Completeness

Every commercial capability exposed by the MineuQR platform SHALL have **exactly one** canonical entitlement definition and **exactly one** enforcement point through the Subscription Runtime Platform.

- No commercial capability may exist without an explicit entitlement mapping.  
- No entitlement may exist without at least one mapped platform capability.  

---

## Governance additions

| Rule | Statement |
|------|-----------|
| Feature mapping | Every commercial Feature SHALL map to exactly one Entitlement |
| Limit mapping | Every commercial Limit SHALL map to exactly one Entitlement |
| Entitlement ownership | Every Entitlement SHALL have at least one owning platform capability |
| No bypass | No commercial capability may bypass the canonical Runtime enforcement layer |
| No duplicates | No duplicate entitlement mappings are permitted (unique `capabilityId`) |
| No orphan capabilities | No orphan capabilities are permitted |
| No orphan entitlements | No orphan entitlements are permitted |
| Determinism | Capability↔Entitlement mappings SHALL remain deterministic and **version-independent** |

**Entitlement identity:** `(kind, entitlementKey)` where `kind ∈ {feature, limit}` — so Feature `categories` and Limit `categories` are distinct entitlements.

---

## Capability coverage certification

**Source of truth:** `server/subscription-runtime/capabilityMatrix.ts` (canonical matrix).

### Coverage audit

| Check | Result |
|-------|--------|
| `FEATURE_KEYS` (18) each mapped by exactly one feature capability | ✓ Complete |
| Limit keys (10) each mapped by exactly one limit capability | ✓ Complete |
| Duplicate `capabilityId` | ✓ None |
| Orphan FEATURE_KEYS (key without capability) | ✓ None |
| Orphan matrix feature keys (not in FEATURE_KEYS) | ✓ None |
| Orphan limit entitlements (key without capability) | ✓ None |
| Missing matrix rows vs commercial feature catalog | ✓ None |

### Certified coverage table

| Capability Name | Capability ID | Canonical Entitlement | Enforcement Entry Point | Runtime Owner | Subscription Dependency |
|-----------------|---------------|----------------------|-------------------------|---------------|-------------------------|
| QR Menu | cap.menu.qr | feature:qrMenu | `hasFeature` / `checkEntitlement` / `checkCapability` | Subscription Runtime | Bound Snapshot (or Legacy Bridge inside Runtime) |
| Menu Categories | cap.menu.categories | feature:categories | same | Subscription Runtime | same |
| Menu Images | cap.menu.images | feature:menuImages | same | Subscription Runtime | same |
| Menu Search | cap.menu.search | feature:search | same | Subscription Runtime | same |
| Ordering | cap.ordering.core | feature:ordering | same (`guestOrderingAuthority` → `hasFeature`) | Subscription Runtime | same |
| Cart | cap.ordering.cart | feature:cart | same | Subscription Runtime | same |
| Checkout | cap.ordering.checkout | feature:checkout | same | Subscription Runtime | same |
| Request Bill | cap.ordering.requestBill | feature:requestBill | same | Subscription Runtime | same |
| Call Waiter | cap.ordering.callWaiter | feature:callWaiter | same | Subscription Runtime | same |
| Order Tracking | cap.ordering.tracking | feature:orderTracking | same | Subscription Runtime | same |
| Reports | cap.reporting.reports | feature:reports | same | Subscription Runtime | same |
| Excel Export | cap.reporting.excel | feature:excelExport | same | Subscription Runtime | same |
| Hotel Mode | cap.hotel.mode | feature:hotelMode | same | Subscription Runtime | same |
| Room QR | cap.hotel.roomQr | feature:roomQr | same | Subscription Runtime | same |
| Dynamic Services | cap.hotel.services | feature:dynamicServiceCatalog | same | Subscription Runtime | same |
| Templates | cap.branding.templates | feature:templates | same | Subscription Runtime | same |
| Custom Colors | cap.branding.colors | feature:customColors | same | Subscription Runtime | same |
| Custom Fonts | cap.branding.fonts | feature:customFonts | same | Subscription Runtime | same |
| Restaurant Quota | cap.limit.restaurants | limit:restaurants | `checkLimit` | Subscription Runtime | same |
| Category Quota | cap.limit.categories | limit:categories | `checkLimit` | Subscription Runtime | same |
| Item Quota | cap.limit.items | limit:items | `checkLimit` | Subscription Runtime | same |
| Orders / Month | cap.limit.ordersPerMonth | limit:ordersPerMonth | `checkLimit` | Subscription Runtime | same |
| QR Codes Quota | cap.limit.qrCodes | limit:qrCodes | `checkLimit` | Subscription Runtime | same |
| Storage Quota | cap.limit.storage | limit:storage | `checkLimit` | Subscription Runtime | same |
| Images Quota | cap.limit.images | limit:images | `checkLimit` | Subscription Runtime | same |
| Staff Accounts | cap.limit.staffAccounts | limit:staffAccounts | `checkLimit` | Subscription Runtime | same |
| Branches Quota | cap.limit.branches | limit:branches | `checkLimit` | Subscription Runtime | same |
| Devices Quota | cap.limit.devices | limit:devices | `checkLimit` | Subscription Runtime | same |

### Certification statement

**COMPLETE COVERAGE CERTIFIED** for the current commercial Feature catalog (`FEATURE_KEYS`) and the declared Limit entitlement vocabulary in the canonical Entitlement Matrix.

**Missing mappings:** none.

**Note (non-blocking residual, not a mapping gap):** DTO/`checkLimit` hard surface today emphasizes `restaurants|categories|items`; extended limit keys remain matrix-mapped under I-SRE-02 and MUST be enforced through Runtime when Snapshot carries them — expansion does not create new capabilities without matrix rows.

---

## Architecture impact

I-SRE-02 guarantees:

1. Complete commercial capability coverage (matrix is mandatory gate)  
2. Deterministic runtime authorization (version-independent mapping)  
3. One-to-one Capability ↔ Entitlement governance (per `capabilityId`)  
4. No enforcement ambiguity (one entry point family under Runtime)  
5. No duplicated authorization logic (I-SRE-01 + unique mappings)  
6. Future capabilities **cannot** ship without explicit entitlement governance (matrix admission required)

---

## Updated documents

| Document | Update |
|----------|--------|
| [ENTITLEMENT_MATRIX.md](./ENTITLEMENT_MATRIX.md) | I-SRE-02 · coverage certification · full enforcement table |
| [RUNTIME_ARCHITECTURE.md](./RUNTIME_ARCHITECTURE.md) | I-SRE-02 in invariants + completeness governance |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | I-SRE-02 compliance row |
| [PRODUCTION_READINESS.md](./PRODUCTION_READINESS.md) | Rev 2 note · completeness certified |
| [00-PROGRAM-PACKAGE.md](./00-PROGRAM-PACKAGE.md) | Rev 2 deliverable index |
| [FINAL-REPORT.md](./FINAL-REPORT.md) | I-SRE-02 referenced |

**Not modified:** runtime code, tests, DB, APIs.

---

## Backward compatibility

| Concern | Assessment |
|---------|------------|
| Existing matrix (28 rows) | Unchanged; amendment **certifies** completeness |
| I-SRE-01 exclusive authority | ✓ Strengthened (completeness of what must pass through Runtime) |
| Snapshot Invariant / I-CPL-13 | ✓ Unchanged |
| Catalog design-time ownership | ✓ Unchanged |
| Feature/Limit key namespaces | ✓ Kind-discriminated identity documented |

No behavior, schema, or API change.

---

## Validation — non-violation check

| Constraint | Result |
|------------|--------|
| Commercial Snapshot Invariant | ✓ |
| I-CPL-13 Snapshot Identity | ✓ |
| I-SRE-01 Runtime Entitlement Authority | ✓ Complementary |
| SSOT | ✓ |
| Aggregate Boundaries | ✓ |
| Commercial Catalog ownership | ✓ |
| Subscription Runtime ownership | ✓ |
| Capability Catalog governance | ✓ Matrix remains Runtime-owned |

---

## Output status

Amendment Revision 2 documentation complete.

**STOP.**
