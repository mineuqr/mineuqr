# ENTITLEMENT MATRIX — SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1

| Field | Value |
|-------|-------|
| **Date** | 2026-07-30 |
| **Source** | `server/subscription-runtime/capabilityMatrix.ts` |
| **Amendments** | Rev 1 (**I-SRE-01**) · Rev 2 (**I-SRE-02**) |

Every protected commercial capability maps to **exactly one** entitlement key.

This matrix is owned by the **Subscription Runtime Platform**. Capability → key mapping does **not** authorize consumers to evaluate entitlements themselves; evaluation MUST use canonical Runtime interfaces (`hasFeature` / `checkEntitlement` / `checkLimit` / `checkCapability`).

---

## I-SRE-02 — Capability Enforcement Completeness

Every commercial capability SHALL have exactly one canonical entitlement definition and exactly one enforcement point through Subscription Runtime.

- No capability without mapping  
- No entitlement without owning capability  
- No duplicate `capabilityId` mappings  
- Mappings deterministic and version-independent  

Entitlement identity = `(kind, entitlementKey)` with `kind ∈ {feature, limit}`.

---

## Coverage certification (Rev 2)

| Audit | Result |
|-------|--------|
| All 18 `FEATURE_KEYS` mapped | ✓ |
| All 10 declared limit keys mapped | ✓ |
| Orphan capabilities | ✓ None |
| Orphan entitlements | ✓ None |
| Duplicate capability IDs | ✓ None |

**COMPLETE COVERAGE CERTIFIED** for the current commercial Feature catalog and declared Limit vocabulary. **Missing mappings: none.**

---

## Features

| Capability Name | Capability ID | Canonical Entitlement | Enforcement Entry Point | Runtime Owner | Subscription Dependency |
|-----------------|---------------|----------------------|-------------------------|---------------|-------------------------|
| QR Menu | cap.menu.qr | feature:qrMenu | `hasFeature` / `checkEntitlement` / `checkCapability` | Subscription Runtime | Bound Snapshot (Legacy Bridge only inside Runtime) |
| Menu Categories | cap.menu.categories | feature:categories | same | Subscription Runtime | same |
| Menu Images | cap.menu.images | feature:menuImages | same | Subscription Runtime | same |
| Menu Search | cap.menu.search | feature:search | same | Subscription Runtime | same |
| Ordering | cap.ordering.core | feature:ordering | same | Subscription Runtime | same |
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

## Limits

| Capability Name | Capability ID | Canonical Entitlement | Enforcement Entry Point | Runtime Owner | Subscription Dependency |
|-----------------|---------------|----------------------|-------------------------|---------------|-------------------------|
| Restaurant Quota | cap.limit.restaurants | limit:restaurants | `checkLimit` | Subscription Runtime | Bound Snapshot (Legacy Bridge only inside Runtime) |
| Category Quota | cap.limit.categories | limit:categories | `checkLimit` | Subscription Runtime | same |
| Item Quota | cap.limit.items | limit:items | `checkLimit` | Subscription Runtime | same |
| Orders / Month | cap.limit.ordersPerMonth | limit:ordersPerMonth | `checkLimit` | Subscription Runtime | same |
| QR Codes Quota | cap.limit.qrCodes | limit:qrCodes | `checkLimit` | Subscription Runtime | same |
| Storage Quota | cap.limit.storage | limit:storage | `checkLimit` | Subscription Runtime | same |
| Images Quota | cap.limit.images | limit:images | `checkLimit` | Subscription Runtime | same |
| Staff Accounts | cap.limit.staffAccounts | limit:staffAccounts | `checkLimit` | Subscription Runtime | same |
| Branches Quota | cap.limit.branches | limit:branches | `checkLimit` | Subscription Runtime | same |
| Devices Quota | cap.limit.devices | limit:devices | `checkLimit` | Subscription Runtime | same |

> Future commercial capabilities MUST be admitted to this matrix before platform exposure (I-SRE-02). DTO hard-surface for extended limits may lag mapping; mapping without orphan gaps is mandatory.
