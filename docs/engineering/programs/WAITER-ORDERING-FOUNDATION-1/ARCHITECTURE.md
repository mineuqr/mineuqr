# WAITER-ORDERING-FOUNDATION-1 — Architecture (Implementation)

**Program:** WAITER-ORDERING-FOUNDATION-1  
**Type:** Platform Foundation  
**Status:** Implemented  
**Depends on:** WAITER-ORDERING-PLATFORM-ARCHITECTURE-1 (Architecture Certified)

---

## 1. Foundation Overview

Waiter Ordering is delivered as a **thin Ordering Channel** over certified platforms:

```
Staff login (/login + returnTo)
  → Waiter shell (/waiter)
  → Table workspace (list + attach)
  → resolveOperationalSession (Session Platform)
  → WaiterOrderingClientHost
  → Ordering Client Platform (browse / cart / checkout)
  → order.placeAsWaiter → IdentityPlaceOrderService
  → Business Identity scope WAITER → WT #NNN
```

No Ordering Platform, Cart, Checkout, Browse, Session, or Business Identity engines were forked.

---

## 2. Architecture Compliance

| Constraint | Compliance |
|------------|------------|
| No duplicated Ordering Platform | Pass — place via existing `IdentityPlaceOrderService` |
| No duplicated Runtime / Runtime Context | Pass — `ordering.getRuntimeBySlug` via Client Platform |
| No duplicated Browse | Pass — `MenuBrowseArea` |
| No duplicated Cart / Checkout | Pass — Client Platform providers |
| No duplicated Business Identity | Pass — scope extension only (`WAITER` / `WT`) |
| Session ownership preserved | Pass — `waiter.attachTable` + required `sessionToken` on place |
| Channel owns orchestration only | Pass — shell / host / navigator / staff place wrapper |

---

## 3. Reuse Matrix

| Dependency | Classification | Notes |
|------------|----------------|-------|
| Ordering Platform / PlaceOrderService | Reuse As-Is | Via IdentityPlaceOrderService |
| IdentityPlaceOrderService | Reuse With Extension | Optional `identityScope` stamp |
| Ordering Runtime | Reuse As-Is | Client host consumption |
| Ordering Client providers | Reuse As-Is | Host composition |
| MenuBrowseArea | Reuse As-Is | Waiter browse stage |
| CartScopeAdapter (`createWaiterStationCartScopeAdapter`) | Reuse As-Is | Already existed |
| `ORDERING_CHANNEL_WAITER_TABLET` | Reuse As-Is | Already defined |
| Operational Session / Dining Session | Reuse As-Is | `resolveOperationalSession` + table anchor |
| Business Identity allocator | Reuse With Extension | `WAITER` → `WT` |
| Staff auth (`/login`, `auth.me`, `assertRestaurantAccess`) | Reuse With Extension | `returnTo` + restaurant-scoped APIs |
| WaiterOrderingClientHost / navigator / shell | **New** | Thin channel chrome |
| `order.placeAsWaiter` | **New** | Auth wrapper only |
| `waiter.*` router | **New** | Floor list + session attach |

---

## 4. New Components Justification

1. **Waiter shell + tables UI** — Channel-owned surface; no existing waiter chrome.  
2. **WaiterOrderingClientHost / navigator** — Same pattern as Kiosk/QR hosts; wrong to reuse kiosk shell semantics.  
3. **`order.placeAsWaiter`** — Public `placeWithIdentity` must not be the staff production path; wrapper forces restaurant access + `identityScope: WAITER`.  
4. **`waiter` router** — Staff floor + attach; Session Platform remains lifecycle owner.

---

## 5. Session Integration

- Selecting a table calls `waiter.attachTable` → `resolveOperationalSession(createTableSessionAnchor(...))`.  
- Open Dining Session is reused when present; otherwise Session Platform creates per existing table policy.  
- Ordering query carries `session` + `sessionId`; checkout requires `sessionToken`.  
- `placeAsWaiter` rejects placements that do not resolve a persistent session id.

---

## 6. Business Identity Integration

- Scopes: `TABLE` | `KIOSK` | **`WAITER`**.  
- Codes: `T` | `K` | **`WT`**.  
- Display: server formatter → `WT #001` (no client formatting).  
- Waiter table fulfilment remains `table` / `table_service`; scope is explicit channel provenance.

---

## 7. Navigation Flow

```
/login?returnTo=/waiter…
  → /waiter (restaurant picker)
  → /waiter/:slug/tables
  → /waiter/:slug/menu|cart|checkout|confirmed
```

Ordering stages reuse Ordering Client Platform navigator stages.

---

## 8. Security Validation

- Staff only via existing subscriber session (`verifiedProcedure` / `protectedProcedure`).  
- `assertRestaurantAccess` on waiter APIs and place.  
- Guest `placeWithIdentity` unchanged and unused by waiter checkout (`placeAuth: "staff"`).  
- Session token required on place; table id/number validated against restaurant.

---

## 9. Out of Scope (confirmed)

Split bills, seat ordering, transfer/merge tables, multi-table, customer notifications, kitchen workflow changes, receipt printing, waiter analytics, offline mode.
