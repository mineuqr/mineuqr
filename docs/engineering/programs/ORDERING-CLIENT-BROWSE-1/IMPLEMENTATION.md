# ORDERING-CLIENT-BROWSE-1 — Implementation
## Phase C — Certification Report

**Program:** ORDERING-CLIENT-BROWSE-1  
**Type:** Architecture Implementation  
**Date:** 2026-07-14  
**Decision:** **CERTIFIED**

---

## 1. Executive Summary

ORDERING-CLIENT-BROWSE-1 moves complete menu browse orchestration into the Ordering Client Platform. QR `MenuView` is a channel shell (bootstrap, dining session, post-submission, tracking, template skin wiring). Category navigation, search, menu/offers tabs, scroll sync, filtered catalog, item selection state, and loading/error presentation status are owned by `OrderingBrowseProvider`. Catalogs are consumed exclusively through Ordering Runtime via `OrderingClientProvider`. No new browse UX was introduced; existing production behaviour is preserved.

---

## 2. Architecture audit (pre-change)

| Area | Pre-change owner |
|------|------------------|
| Menu pages | `MenuView` (QR) |
| Browse state (category, search, tab, scroll) | `MenuView` `useState` |
| Category navigation / selected category | `MenuView` |
| Search state | `MenuView` |
| Item selection | None (add-to-cart local flash only) |
| Menu loading / empty / error | `MenuView` conditionals |
| Runtime queries | Client Platform (`useOrderingRuntime`) via QR hook |
| Reusable skins | `MenuTemplates` / `components/menu/*` |
| QR-specific browse logic | Entire browse controller embedded in page |

---

## 3. Browse ownership map

| Concern | Owner |
|---------|--------|
| Browse lifecycle | `OrderingBrowseProvider` |
| Category / search / tab / filter | Client Platform browse module |
| Presentation status | `resolveBrowsePresentationStatus` |
| Item selection API | `OrderingBrowseProvider` |
| Runtime catalogs | Ordering Runtime → `OrderingClientProvider` |
| Stage navigation | `OrderingNavigator` |
| Template skins | `MenuTemplates` |
| QR shell / session / tracking / trackView | `MenuView` / `TableOrderingShell` |

---

## 4. Files changed

| File | Change |
|------|--------|
| `client/src/lib/ordering-client/browse/browseTypes.ts` | **New** tab + presentation contracts |
| `client/src/lib/ordering-client/browse/browseCatalog.ts` | **New** pure filter/default/tab/status helpers |
| `client/src/lib/ordering-client/browse/OrderingBrowseProvider.tsx` | **New** browse orchestrator |
| `client/src/lib/ordering-client/qr/QrOrderingClientHost.tsx` | Mounts browse provider |
| `client/src/lib/ordering-client/qr/QrBrowseOnlyHost.tsx` | **New** public `/menu/:slug` host |
| `client/src/lib/ordering-client/index.ts` | Browse exports |
| `client/src/pages/MenuView.tsx` | Thin QR shell |
| `client/src/components/menu/types.ts` | `MenuBrowseTab` from platform |
| `client/src/lib/ordering-client/__tests__/orderingClientBrowse*.ts` | Unit + architecture guards |
| Migration + ADR/docs | Guard update + program docs |

**Not modified:** Checkout, Cart orchestration, Ordering Runtime delivery, Ordering Platform, Database, Kitchen, Expo, Printing, Kiosk/Waiter UI.

---

## 5. Browse lifecycle summary

1. Channel mounts host (`QrOrderingClientHost` or `QrBrowseOnlyHost`)  
2. `OrderingClientProvider` loads runtime catalogs  
3. `OrderingBrowseProvider` sets default category, owns search/tab/scroll/selection  
4. `filterBrowseItems` derives visible items  
5. `resolveBrowsePresentationStatus` → loading | not_found | unavailable | ready  
6. Channel shell renders skins + QR lifecycle chrome  

---

## 6. QR migration summary

| Before | After |
|--------|-------|
| Page-owned browse state | Platform `OrderingBrowseProvider` |
| Browse-only via QR runtime hook only | `QrBrowseOnlyHost` (runtime + browse) |
| Table host: runtime + cart | Table host: runtime + browse + cart |
| Templates fed by page state | Templates fed by platform browse |

Behavioural parity: same filters, default category, offers-tab fallback, scroll-top threshold, loading/error screens, dining session, post-submission, cart drawer gating.

---

## 7. Test summary

| Suite | Tests | Result |
|-------|-------|--------|
| `orderingClientBrowse.test.ts` | 6 | Pass |
| `orderingClientBrowse.architecture.guards.test.ts` | 5 | Pass |
| ordering-client runtime + cart suites | 16 | Pass |
| `qrOrderingRuntimeMigration.architecture.guards.test.ts` | 4 | Pass |

**Coverage:** category/search filter, default category, offers tab fallback, presentation status, ownership guards (MenuView has no browse `useState`, host mounts provider, no parallel runtime queries).

---

## 8. Build result

```
npm run build — SUCCESS
```

---

## 9. Certification report

| Criterion | Status |
|-----------|--------|
| Browse ownership in Client Platform | ✓ |
| Category switching / search / tabs | ✓ |
| Loading / empty / error orchestration | ✓ |
| Runtime integration only (no duplicate queries) | ✓ |
| Navigation: stage via OrderingNavigator; browse state via provider | ✓ |
| Deep links / existing QR routes stable | ✓ |
| No visible UX redesign | ✓ |
| Backward compatibility | ✓ |
| Out-of-scope surfaces untouched | ✓ |

---

**ORDERING-CLIENT-BROWSE-1 is CERTIFIED.**

Ordering Client Platform is the sole browse orchestrator. QR is shell + bootstrap + deep-link + tracking. Channels must not own browse state.
