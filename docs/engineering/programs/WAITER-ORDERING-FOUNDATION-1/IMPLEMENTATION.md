# WAITER-ORDERING-FOUNDATION-1 — Engineering Report

**Program:** WAITER-ORDERING-FOUNDATION-1  
**Type:** Platform Foundation  
**Date:** 2026-07-15  
**Decision:** **FOUNDATION CERTIFIED**

---

## 1. Foundation Overview

Waiter Ordering is operational as a thin channel over the certified Ordering Platform:

- Staff authenticate via existing login (`/login` + `returnTo`).
- Waiter workspace lists accessible restaurants and floor tables.
- Table selection attaches a Restaurant Session via Session Platform.
- Ordering stages run inside Ordering Client Platform (browse / cart / checkout).
- Placement uses authenticated `order.placeAsWaiter` → `IdentityPlaceOrderService`.
- Business Display Identity allocates under scope `WAITER` → `WT #001`.

---

## 2. Architecture Compliance

| Rule | Result |
|------|--------|
| Channel ≠ new Ordering System | **PASS** |
| No duplicate Ordering / Runtime / Browse / Cart / Checkout | **PASS** |
| No duplicate Business Identity allocator | **PASS** (scope extension only) |
| Session Platform remains session owner | **PASS** |
| Waiter owns orchestration only | **PASS** |
| Out-of-scope features absent | **PASS** |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 3. Reuse Matrix

| Subsystem | Classification |
|-----------|----------------|
| PlaceOrderService / IdentityPlaceOrderService | Reuse As-Is / With Extension (`identityScope`) |
| Ordering Runtime + Client providers | Reuse As-Is |
| MenuBrowseArea | Reuse As-Is |
| `createWaiterStationCartScopeAdapter` | Reuse As-Is |
| Operational Session resolve + table anchor | Reuse As-Is |
| Business Identity allocator / formatter | Reuse With Extension (`WAITER`/`WT`) |
| Staff auth + `assertRestaurantAccess` | Reuse With Extension |
| Waiter shell / host / navigator | **New** |
| `order.placeAsWaiter`, `waiter.*` | **New** (auth + attach wrappers) |

---

## 4. New Components Justification

| Component | Why required |
|-----------|----------------|
| `WaiterShell` + tables/browse/cart/checkout/confirmation stages | Channel chrome; no prior waiter UI |
| `WaiterOrderingClientHost` + navigator | Channel binding for Client Platform (mirror kiosk/QR) |
| `waiter` router (`listRestaurants`, `listFloorTables`, `attachTable`) | Staff floor + Session attach without forking Session Platform |
| `order.placeAsWaiter` | Authenticated place + forced `identityScope: "WAITER"`; must not use public guest path |
| BI scope `WAITER`/`WT` | Required so waiter table orders do not join guest `TABLE` sequence |

---

## 5. Session Integration

1. `waiter.attachTable` → `resolveOperationalSession(createTableSessionAnchor)`.
2. Existing open Dining Session reused; else Session Platform creates per table policy.
3. Client stores `session` + `sessionId` in route query for the active table.
4. Checkout passes `sessionToken`; server rejects waiter place without resolved session id.

No second session lifecycle.

---

## 6. Business Identity Integration

| Item | Value |
|------|-------|
| Scope | `WAITER` |
| Code | `WT` |
| Example | `WT #001` |
| Formatter owner | Server `DisplayReferenceFormatter` / `OrderDisplayIdentityResolver` |
| Client formatting | Forbidden |

`PlaceOrderCommand.identityScope` is threaded through repository → allocator. Waiter place forces `"WAITER"` regardless of table fulfilment stamps.

---

## 7. Navigation Flow

```
Waiter Login (/login?returnTo=…)
  ↓
Restaurant picker (/waiter)
  ↓
Restaurant Tables (/waiter/:slug/tables)
  ↓
Active Table + Session attach
  ↓
Ordering (/menu)
  ↓
Cart
  ↓
Checkout (placeAsWaiter)
  ↓
Confirmation (displayReference)
```

Channel-aware routes; Ordering Client stages reused.

---

## 8. Security Validation

| Control | Status |
|---------|--------|
| Staff session required for shell | **PASS** |
| Restaurant-scoped floor / attach / place | **PASS** (`assertRestaurantAccess`) |
| Guest `placeWithIdentity` not used by waiter | **PASS** (`placeAuth: "staff"`) |
| Session token required on place | **PASS** |
| Table membership validated | **PASS** |
| No privilege above restaurant ownership/admin | **PASS** |

Foundation staff model: restaurant owner / admin (existing membership). Dedicated waiter roles remain future work.

---

## 9. Regression Analysis

| Area | Risk | Mitigation |
|------|------|------------|
| QR / Kiosk place paths | Low | Unchanged public procedures |
| BI TABLE/KIOSK sequences | Low | Explicit scope only; no default reassignment |
| Checkout provider | Medium | Additive `placeAsWaiter` branch gated by `placeAuth` |
| Login redirect | Low | Optional `returnTo` with same-origin path checks |

Targeted vitest suites for BI scope, checkout guards, and waiter architecture guards: **PASS**.

---

## 10. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Authenticate staff | **PASS** |
| Open Waiter workspace | **PASS** (`/waiter`) |
| Select restaurant table | **PASS** |
| Resolve Restaurant Session | **PASS** (`attachTable`) |
| Enter Ordering Client Platform | **PASS** (host) |
| Shared Runtime Context | **PASS** |
| Reuse Browse / Cart / Checkout | **PASS** |
| Place via Ordering Platform | **PASS** (`placeAsWaiter` → IdentityPlaceOrder) |
| BI display `WT #001` | **PASS** (server scope) |
| No duplicated ordering/checkout/browse/BI | **PASS** |
| No Session ownership violations | **PASS** |
| No architectural boundary violations | **PASS** |

---

## 11. Certification

**FOUNDATION CERTIFIED.**

The Waiter Ordering channel is operational as a thin orchestration layer over the existing Ordering Platform, with shared platform capabilities reused and no architectural ownership violations.

### Key files

| Area | Path |
|------|------|
| BI scope | `server/order/business-identity/application/resolveBusinessIdentityScope.ts` |
| Place + identityScope | `server/order/application/PlaceOrderService.ts`, `IdentityPlaceOrderService.ts` |
| APIs | `server/routers.ts` (`waiter.*`, `order.placeAsWaiter`) |
| Host | `client/src/lib/ordering-client/waiter/*` |
| Shell | `client/src/pages/waiter/*` |
| Routes | `client/src/App.tsx` |
| Guards | `client/src/lib/ordering-client/__tests__/waiterOrderingFoundation.architecture.guards.test.ts` |
