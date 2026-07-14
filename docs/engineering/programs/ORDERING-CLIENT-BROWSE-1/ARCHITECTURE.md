# ORDERING-CLIENT-BROWSE-1 — Architecture

**Status:** Implemented  
**Depends on:** ORDERING-CLIENT-RUNTIME-1, ORDERING-CLIENT-CART-1, ADR-ARCH-018  
**Date:** 2026-07-14

---

## 1. Architecture audit (pre-change)

| Symbol | Owned | Coupling |
|--------|-------|----------|
| `pages/MenuView.tsx` | Category, search, menu tab, scroll-top, filtered items, loading/error UI, template wiring | QR routes + dining session + tracking |
| `components/MenuTemplates.tsx` | Visual skins; receives browse props | Soft-coupled via `tableNumber` + cart controls |
| `components/menu/*` | Offers tab bar / panel | Presentation |
| `useQrOrderingRuntime` | Catalog delivery (already Client Platform) | QR-named thin wrapper |
| `QrOrderingClientHost` | Runtime + cart host | No browse provider |
| `OrderingNavigator` | browse ↔ checkout ↔ tracking | Stages only; not category state |

**Gap:** Browse orchestration lived in the QR `MenuView` page. Channels would reimplement category/search/tab/filter lifecycle.

---

## 2. Target ownership map

| Concern | Owner |
|---------|--------|
| Browse lifecycle (category, search, tab, scroll sync) | `OrderingBrowseProvider` |
| Filtered catalog derivation | `browse/browseCatalog.ts` (pure) |
| Loading / not-found / unavailable presentation status | `resolveBrowsePresentationStatus` |
| Item selection state (platform API) | `OrderingBrowseProvider` |
| Runtime catalog consumption | Ordering Runtime via Client Platform (unchanged) |
| Template skins | `MenuTemplates` (presentation only) |
| QR entry / bootstrap / deep links | `TableOrderingShell` / routes |
| Dining session / post-submission / trackView | QR channel (`MenuView` shell) |
| Cart / Checkout | Out of scope (CART-1 / future CHECKOUT-1) |

---

## 3. Composition

```
Channel Shell (QR)
  · slug / table from route
  · deep links, tracking, dining session
      │
      ▼
QrOrderingClientHost
  · CartScopeAdapter + OrderingNavigator
      │
      ▼
OrderingClientProvider (runtime)
      │
      ▼
OrderingBrowseProvider   ← Client Platform browse orchestrator
      │
      ▼
OrderingCartProvider (table path)
      │
      ▼
MenuView (shell) → MenuTemplates (skins)
```

Browse-only `/menu/:slug` mounts `OrderingClientProvider` + `OrderingBrowseProvider` without cart.

---

## 4. Navigation ownership

| Navigation | Owner |
|------------|--------|
| Stage: browse / checkout / tracking | `OrderingNavigator` (channel route mapping) |
| Category switching, active category, search, menu/offers tab | `OrderingBrowseProvider` |
| Scroll-to-top affordance sync | `OrderingBrowseProvider` |
| Item open/select (state API) | `OrderingBrowseProvider` |

Channels never own browse state.

---

## 5. Boundaries

**In scope:** Browse ownership consolidation into Ordering Client Platform  
**Out of scope:** Checkout, Cart redesign, Ordering Runtime/Platform, Kiosk/Waiter UI, Database, Kitchen, Expo, Printing
