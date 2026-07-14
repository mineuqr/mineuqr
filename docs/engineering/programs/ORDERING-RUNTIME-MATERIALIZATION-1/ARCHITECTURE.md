# ORDERING-RUNTIME-MATERIALIZATION-1 — Runtime Materialization
## Binding Architecture Document

**Program:** ORDERING-RUNTIME-MATERIALIZATION-1  
**Type:** Core Runtime Composition Architecture  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  
**Depends on:** ORDERING-PLATFORM-ARCHITECTURE-1, ORDERING-RUNTIME-CONTEXT-1

---

## 1. Vision

Materialization is the canonical composition layer that assembles every authoritative source into one normalized runtime input for `OrderingRuntimeContextFactory`.

Materialization is **not** data loading. It is composition: collect → validate → normalize → compose.

---

## 2. Architecture

```
Restaurant
        │
        ▼
Ordering Platform
        │
        ▼
Repositories / Business Services   ← authoritative data only
        │
        ▼
OrderingRuntimeMaterializer        ← sole composition boundary
        │
        ▼
OrderingRuntimeContextInput        ← fully normalized
        │
        ▼
OrderingRuntimeContextFactory      ← construction + freeze only
        │
        ▼
Immutable OrderingRuntimeContext
        │
   QR / Kiosk / Mobile / Waiter (future consumers)
```

---

## 3. Separation of Responsibilities

| Layer | Owns | Does NOT own |
|-------|------|--------------|
| Repositories | Authoritative data | Runtime composition |
| **Materializer** | Collect, validate, normalize, compose | Immutability freeze, channel UX |
| Factory | Construct + deep-freeze | Business defaults, source merging |
| Clients | Consume runtime | Materialization / construction |

---

## 4. Composition Pipeline

1. **Collect** — accept `OrderingRuntimeMaterializationRequest` (source bag)
2. **Validate** — channel, restaurant, business day, menu version, locale, currency match, supported channels
3. **Normalize** — trim, currency uppercase, default arrays, derive availability reasons/gates, merge channel policy overlays, assign metadata
4. **Compose** — produce complete `OrderingRuntimeContextInput`
5. **Construct** — `factory.create(input)` → frozen `OrderingRuntimeContext`

---

## 5. Contracts

| Module | Role |
|--------|------|
| `shared/.../orderingRuntimeMaterializationContract.ts` | Source bag request types |
| `shared/.../orderingRuntimeContract.ts` | `OrderingRuntimeContext` + complete `OrderingRuntimeContextInput` |
| `server/.../OrderingRuntimeMaterializer.ts` | Sole materializer |
| `server/.../OrderingRuntimeContextFactory.ts` | Construction only |

---

## 6. Ownership Matrix

| Concern | Authority |
|---------|-----------|
| Runtime composition | `ORDERING_PLATFORM_RUNTIME_MATERIALIZER` |
| Runtime construction | `ORDERING_PLATFORM_RUNTIME_CONTEXT_FACTORY` |
| Place order | `PlaceOrderService` |
| QR UX | Unchanged (not migrated) |

---

## 7. Architecture Guards

| Guard | Rule |
|-------|------|
| ORM-01 | Ownership registry names the materializer |
| ORM-02 | Exactly one `OrderingRuntimeMaterializer` class |
| ORM-03 | Factory has no business composition / UUID defaults |
| ORM-04 | Materializer validates + calls factory |
| ORM-05 | `db.ts` does not compose runtime |
| ORM-06 | QR pages do not materialize/construct |

---

## 8. Out of Scope

QR migration, Kiosk, DB loaders, caching, API redesign, checkout/cart redesign, operational runtime.

---

This document is binding for ORDERING-RUNTIME-MATERIALIZATION-1.
