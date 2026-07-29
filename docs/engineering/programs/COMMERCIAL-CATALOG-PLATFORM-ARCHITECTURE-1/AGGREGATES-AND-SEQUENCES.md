# Aggregates, Boundaries & Sequences

**Program:** COMMERCIAL-CATALOG-PLATFORM-ARCHITECTURE-1  
**Status:** Architecture only  
**Date:** 2026-07-29

---

## 1. Aggregate boundaries (conceptual)

| Aggregate / Catalog root | Boundary |
|--------------------------|----------|
| **Plan Identity** | Identity + presentation family; children = Versions |
| **Plan Version** | Immutable commercial contract after publish; owns refs to bundles/prices |
| **Feature Catalog** | Global Feature Keys |
| **Limit Catalog** | Global Limit Keys |
| **Price Book / Price Row** | Version-scoped; immutable when published with Version |
| **Promotion** | Independent aggregate; effects at commerce events |
| **Migration Policy** | Catalog policy objects referenced by Versions / programs |
| **Subscription** | **Not** owned here — Subscription Platform aggregate referencing `planVersionId` |

No second monetary Aggregate — Billing remains outside.

---

## 2. Sequence — Publish new Version

```
Admin (RBAC: catalog.admin)
  → create Draft Plan Version under Plan Identity
  → attach Feature Bundle + Limit Profile + Prices + Cycles
  → validate completeness
  → publish
  → Version immutable (CC-02)
  → storefront may offer Version
```

---

## 3. Sequence — New Subscription

```
Customer / Admin
  → select Published Plan Version + cycle (+ region/currency CC-15)
  → optional Promotion apply (CC-08)
  → Tenant Identity: Canonical Tenant ID
  → Subscription Platform creates Subscription bound to planVersionId (CC-03)
  → capture immutable Commercial Snapshot (CC-13)
  → Billing (OOS) charges using Version price + promotion + tax-policy ref
  → Entitlement from Snapshot feature/limit facts
```

---

## 4. Sequence — Commercial evolution without customer break

```
Published Version N (customers bound + Snapshots)
  → Admin Draft Version N+1 (new prices/features)
  → declare CC-14 compatibility (upgrade/downgrade targets, breaks)
  → Publication Validation Gate CC-16
  → Publish N+1
  → Set Migration Policy (e.g. Remain / Upgrade on Renewal within allow-list)
  → Optionally Deprecate N
  → Existing Subscriptions stay on N; Snapshots unchanged (CC-13)
  → History of N remains readable (CC-10, CC-11)
```

---

## 5. Sequence — Promotion checkout

```
Select Plan Version price (list, regional)
  → apply Promotion
  → charge = f(list, promotion)
  → persist invoice lines: versionId, list, promotionId, net
  → Version rows unchanged
  → Snapshot records promotion if contract activates
```

---

## 6. Sequence — Publish with validation gate (**CC-16**)

```
Draft Version
  → validate pricing, cycle, feature bundle, limit profile
  → validate migration + retirement policies
  → validate CC-14 compatibility declarations
  → validate regional readiness if multi-region (CC-15)
  → PASS → Published (immutable)
  → FAIL → remain Draft with errors
```

---

## 7. Boundary diagram

```
┌─ Commercial Catalog ─────────────────────────────┐
│ Plan Identity ─◄── Plan Version (immutable)      │
│ Feature · Limit · Promotions · Regional Policies │
│ Compatibility Matrix · Publication Gate          │
└──────────────────────────┬───────────────────────┘
                           │ planVersionId
┌──────────────────────────▼───────────────────────┐
│ Subscription — instances + Commercial Snapshot   │
└──────────────────────────┬───────────────────────┘
                           │ charge signals
┌──────────────────────────▼───────────────────────┐
│ Billing Providers (OOS)                          │
└──────────────────────────────────────────────────┘
```
