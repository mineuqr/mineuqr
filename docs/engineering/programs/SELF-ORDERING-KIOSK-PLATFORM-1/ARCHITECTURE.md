# SELF-ORDERING-KIOSK-PLATFORM-1 — Architecture

**Status:** Implemented  
**Depends on:** SELF-ORDERING-KIOSK-ARCHITECTURE-1, ADR-ARCH-018, ORDERING-CLIENT-* (RUNTIME/CART/BROWSE/CHECKOUT/GOVERNANCE)  
**Date:** 2026-07-14

---

## 1. Architecture audit

| Area | Pre-change | Target |
|------|------------|--------|
| Kiosk UI | None (contracts only) | Channel shell + Client Platform composition |
| Browse/cart/checkout | N/A | Ordering Client Platform providers |
| Session / idle / language | Contracts only | Kiosk shell |
| Runtime | `getRuntimeBySlug` via Client Platform | Unchanged ownership |
| QR | Live | Unaffected |

---

## 2. Kiosk ownership map

| Concern | Owner |
|---------|--------|
| Idle / touch-to-start | Kiosk shell |
| Language selection | Kiosk shell |
| Auto-reset timer / confirmation dwell | Kiosk shell |
| Device session id + isolation wipe | Kiosk shell (`loadOrCreate` / `rotate` — Runtime Identity Invariant) |
| `CartScopeAdapter` / `OrderingNavigator` factories | Kiosk channel (`ordering-client/kiosk`) |
| Browse / cart / checkout / submission | Ordering Client Platform |
| Runtime delivery / gates | Ordering Client Platform → Ordering Runtime |
| Business rules / PlaceOrder | Ordering Platform |
| Station table binding (`?table=`) | Kiosk channel config (existing table API) |

---

## 3. Composition diagram

```
KioskShell (idle | language | reset)
      │  on active ordering stages
      ▼
KioskOrderingClientHost
  · createKioskCartScopeAdapter(slug, stationId, deviceSessionId, kioskId)
  · createKioskOrderingNavigator(routes + query)
      │
      ▼
OrderingClientProvider
  → OrderingBrowseProvider
    → OrderingCartProvider
      → OrderingCheckoutProvider
            │
            ▼
KioskBrowseStage | KioskCartStage | KioskCheckoutStage | KioskConfirmationStage
(presentation chrome only)
```

---

## 4. Flow

```
Idle → Touch → Language → Browse → Cart → Checkout → Place Order
  → Confirmation → Automatic Reset → Idle
```

Place order is Client Platform checkout (`order.create`). Confirmation + reset are channel-owned.

---

## 5. Adapters

**CartScopeAdapter** key: `mineuqr:cart:{slug}:station:{stationId}:device:{deviceSessionId}[:kioskId]`

**Navigator:** `goToBrowse|Cart|Checkout|Confirmation|Tracking` + shell `goToIdle|Language|ResetIdle`. Query (`station`, `table`, `kiosk`) preserved.

### Ordering Runtime Identity Invariant — **OI-RT-01**

`deviceSessionId` is **immutable for one customer journey**. It MUST survive Browse → Cart → Checkout → Payment → Confirmation. Navigation / shell remount MUST NOT mint a new id. Rotate only on idle Start, intentional reset, or idle timeout ([Ordering-Invariants.md](../../../architecture/constitution/Ordering-Invariants.md#oi-rt-01--runtime-identity-continuity) · ADR-ARCH-018 Decision §6 · SELF-ORDERING-KIOSK-ARCHITECTURE-1 §6.1 · `kioskDeviceSessionIdentity.ts`).

---

## 6. Boundaries

Kiosk MUST NOT: own runtime queries, cart persistence, browse filters, notes validation, pricing, PlaceOrderService.  
QR MUST remain unchanged.
