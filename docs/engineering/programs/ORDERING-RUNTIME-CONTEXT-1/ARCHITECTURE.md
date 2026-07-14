# ORDERING-RUNTIME-CONTEXT-1 — Ordering Runtime Context
## Binding Architecture Document

**Program:** ORDERING-RUNTIME-CONTEXT-1  
**Type:** Core Runtime Architecture  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** 2026-07-14  
**Depends on:** ORDERING-PLATFORM-ARCHITECTURE-1

---

## 1. Objective

Introduce the canonical immutable **OrderingRuntimeContext** and its sole constructor **OrderingRuntimeContextFactory**.

This program establishes the runtime foundation only. It does **not** migrate QR, implement Kiosk, materialize from the database, or change production behavior.

---

## 2. Architecture Decision

```
Restaurant
        │
        ▼
Ordering Platform
        │
        ▼
OrderingRuntimeContextFactory   ← sole construction path
        │
        ▼
Immutable OrderingRuntimeContext
        │
   ┌────┴────┬──────────┬─────────────┐
   ▼         ▼          ▼             ▼
 QR Client  Kiosk     Mobile App   Waiter Tablet
 (future    (future)  (future)     (future)
  consume)
```

Every ordering channel will consume the same runtime snapshot. No channel constructs business state independently.

---

## 3. Runtime Context Specification

`OrderingRuntimeContext` (schema version **1**) is a read-only snapshot representing:

| Section | Responsibility |
|---------|----------------|
| `channel` | Ordering channel identity |
| `restaurant` | Restaurant identity (id, slug, name, currency, timezone) |
| `business` | Business day, availability, hours projection |
| `availability` | Browse / place-order gates + reasons |
| `locale` | Language, direction, theme (not form factor) |
| `menu` | Category / product / modifier / offer / availability projection |
| `policies` | Cart, checkout, guest ordering policies |
| `pricing` | Currency, taxes, service charge, discount pipeline context |
| `capabilities` | Platform ordering capabilities |
| `featureFlags` | Platform feature flags |
| `metadata` | schemaVersion, createdAt, runtimeId |

Contract: `shared/ordering-platform/orderingRuntimeContract.ts`

**Presentation independence:** the runtime must not include screen size, orientation, device type, or form factor. Those remain channel concerns.

---

## 4. Factory Design

| Item | Value |
|------|-------|
| Owner | Ordering Platform (server) |
| Module | `server/ordering-platform/OrderingRuntimeContextFactory.ts` |
| Entry | `OrderingRuntimeContextFactory.create(input)` / `orderingRuntimeContextFactory` |
| Input | `OrderingRuntimeContextInput` (mutable staging DTO) |
| Output | Frozen `OrderingRuntimeContext` |
| Freeze | `shared/ordering-platform/freezeOrderingRuntimeContext.ts` |

**Lifecycle:** input → validate → normalize → deep-freeze → return.

**Not in this program:** DB loaders, API endpoints, QR wiring, projection builders.

---

## 5. Ownership Matrix

| Concern | Owner | Consumer |
|---------|-------|----------|
| Runtime context type | Shared platform contract | All channels |
| Runtime construction | `OrderingRuntimeContextFactory` | Materializers (future) |
| Runtime freeze | Shared freeze helper (factory-only) | Factory |
| Runtime mutation | Forbidden | — |
| Channel layout / orientation | Channel | — |
| Place order | `PlaceOrderService` | All channels |
| QR menu/checkout UX | QR channel (unchanged) | Guests |

Registry: `server/ordering-platform/orderingPlatformOwnership.ts`  
(`ORDERING_PLATFORM_RUNTIME_CONTEXT_FACTORY`)

---

## 6. Channel Rules

- Clients **consume** `OrderingRuntimeContext`.
- Clients **never mutate** it.
- Clients **never rebuild** it.
- Clients **never** import or invoke `OrderingRuntimeContextFactory`.

QR contract: `QR_FORBIDDEN_RUNTIME_CONSTRUCTION` in `qrOrderingChannelContract.ts`.

This program does **not** migrate QR off its current assembly path. Migration is a future program.

---

## 7. Architecture Guards

| Guard | Rule |
|-------|------|
| ORC-01 | Ownership registry names the runtime factory |
| ORC-02 | Server has exactly one construction path (the factory) |
| ORC-03 | Shared contract has no form-factor fields |
| ORC-04 | Platform concerns include `ordering_runtime_context` |
| ORC-05 | QR pages do not construct runtime |
| ORC-06 | Client ordering-platform does not own a factory |

---

## 8. Out of Scope

QR migration, Kiosk, Mobile, Waiter Tablet, runtime materialization, menu/cart/checkout redesign, payments, guest accounts, coupons, loyalty, reservations, operational runtime, Kitchen/Expo/Pickup, database changes, API redesign.

---

## 9. Future Programs

| Program | Builds on |
|---------|-----------|
| ORDERING-RUNTIME-MATERIALIZATION-1 | Load projections into factory input |
| QR-RUNTIME-ADOPTION-1 | QR consumes runtime instead of local assembly |
| KIOSK-CHANNEL-1 | Kiosk client consuming the same runtime |

---

This document is binding for ORDERING-RUNTIME-CONTEXT-1.
