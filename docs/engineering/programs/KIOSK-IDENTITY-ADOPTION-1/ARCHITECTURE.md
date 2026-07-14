# KIOSK-IDENTITY-ADOPTION-1 — Architecture

**Status:** Implemented  
**Depends on:** ADR-ARCH-018, ADR-ARCH-019, SELF-ORDERING-KIOSK-PLATFORM-1, ORDER-IDENTITY-RUNTIME-1, OPERATIONAL-SESSION-PLATFORM-1, NON-TABLE-PLACE-ORDER-1  
**Date:** 2026-07-14  
**Type:** Channel adoption (Kiosk → Order Identity)

---

## 1. Architecture audit

| Dependency | Classification | Resolution |
|------------|----------------|------------|
| `?table=` required for place order | Historical / Accidental | **Removed** |
| `table.getByNumber` in kiosk checkout | Accidental | **Removed** |
| `order.create` table path from kiosk | Historical | **Replaced** by identity submit |
| Cart scope `station` + device | Required | Unchanged |
| Idle / language / auto-reset | Required (shell) | Unchanged |
| Ordering Client Platform browse/cart/checkout | Required | Unchanged ownership |
| QR `order.create` + table identity | Production compatibility | Untouched |

### Root cause

Kiosk PLATFORM-1 composed Client Platform correctly but still submitted through the historical table PlaceOrder API, forcing `?table=` as a workaround.

---

## 2. Kiosk identity adoption

```
/kiosk/:slug?station=&kiosk=
        │
        ▼
Kiosk shell (idle / language / reset)
        │
        ▼
Ordering Client Platform checkout
        │  identity: { serviceMode: counter, fulfilmentAnchor: station }
        ▼
order.placeWithIdentity   ← channel-agnostic
        │
        ▼
IdentityPlaceOrderService
        │
        ▼
resolveOperationalSession(station) → ephemeral
        │
        ▼
PlaceOrderService (LEGACY_NON_TABLE dual-write)
```

- **Service Mode:** `counter`  
- **Fulfilment Anchor:** `station` (`stationId` from query)  
- **Operational Session:** Station Anchor → ephemeral (no Dining Session / no fake table)

---

## 3. Runtime ownership verification

| Layer | Owns | Must not own |
|-------|------|--------------|
| Ordering Platform / IdentityPlaceOrder | Mode, anchor, session resolve, place | Channel name “kiosk” |
| Ordering Client Platform | Browse, cart, checkout, dual submit paths | Kiosk idle chrome |
| Kiosk shell + adapters | Idle, language, device session, reset, station→identity adapter | PlaceOrder rules, fake tables |
| QR | Table Fulfilment Anchor via `order.create` | Station identity |

**Governance:** Platform code never branches on kiosk. Kiosk adapts to platform facts only.

---

## 4. Operational Session integration

Station Anchor → `resolveEphemeralOperationalSession` → `sessionId: null`.  
Table Session not required. Lifecycle remains Session Platform–owned.

---

## 5. QR compatibility

- QR routes / UX / BI / numbering unchanged  
- `CheckoutPage` still submits `tableId` / `tableNumber` via `order.create`  
- Runtime materializer defaults unchanged  

---

## 6. Compatibility strategy

- Optional historical `?table=` on kiosk URLs is **ignored** (not re-emitted)  
- Default `station=kiosk-1` retained as station identity string, not a table  
- No schema migration  
