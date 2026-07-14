# KIOSK-BROWSE-PRESENTATION-ADOPTION-1 — Implementation
## Engineering / Certification Report

**Program:** KIOSK-BROWSE-PRESENTATION-ADOPTION-1  
**Type:** Presentation Adoption (Shared Browse UI)  
**Date:** 2026-07-15  
**Decision:** **CERTIFIED**

---

## 1. Browse Presentation Forensics

### Root cause

Self Ordering Kiosk dropped browse metadata at `KioskBrowseStage` by rendering a custom name/price list instead of the shared QR item presentation. Catalog fields already existed on `browse.filteredItems` from Ordering Runtime → OrderingBrowseProvider.

### Evidence

- Loader returns full `menu_items` rows (`imageUrl`, `descriptionAr`, `calories`, `isAvailable`, `price`).
- `useOrderingRuntime` maps `runtime.menu.products` → `items` without stripping.
- `OrderingBrowseProvider` exposes `filteredItems`, `offers`, search, categories, tabs.
- QR `MenuTemplates` rendered image/description/calories/availability via local Grid/ListView.
- Pre-adoption kiosk only painted name + price (+ passed `imageUrl` into cart, not display).

### Pipeline trace

See `ARCHITECTURE.md` §1.

---

## 2. Architecture Validation

| Boundary | Status |
|----------|--------|
| Order Aggregate / Ordering Platform | Untouched |
| Runtime / Materializer / Projection | Untouched |
| Read Models / DTO / Storage | Untouched |
| Business Identity / Session | Untouched |
| Shared browse presentation | Extracted + adopted |
| QR Ordering | Uses same `MenuBrowseArea` |

---

## 3. Files Modified

| Area | Files |
|------|--------|
| Shared browse | `MenuBrowseArea.tsx`, `MenuItemsGrid.tsx`, `MenuSearchAndCategories.tsx`, `menuBrowseTypes.ts` |
| QR | `MenuTemplates.tsx` — imports shared `MenuBrowseArea`; local item/search forks removed |
| Kiosk | `KioskBrowseStage.tsx` — consumes `MenuBrowseArea` with `canAddToCart` |
| Guards | `MenuBrowseArea.architecture.guards.test.ts` |
| Docs | program `ARCHITECTURE.md` + this report |

---

## 4. Shared Component Adoption Summary

| Shared component | QR | Kiosk |
|------------------|----|-------|
| `MenuBrowseArea` | Yes (templates) | Yes |
| `MenuSearchAndCategories` | Yes | Yes |
| `MenuItemsGrid` | Yes | Yes |
| `MenuOffersTabBar` / `OffersTabPanel` | Yes | Yes (via area) |

Kiosk no longer maintains a parallel item-row presentation.

---

## 5. Regression Analysis

| Surface | Result |
|---------|--------|
| QR templates | Same browse composition via shared import |
| Kiosk offers | Retained through `MenuBrowseArea` |
| Runtime / Projection / DTO | No changes |
| Cart add on kiosk | `canAddToCart` (mirrors offers pattern) |
| Unavailable items | Dimmed + badge; add gated by `isAvailable` |

---

## 6. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Item image | **PASS** (shared grid/list) |
| Item description | **PASS** (`descriptionAr`) |
| Calories | **PASS** (grid view; same as QR) |
| Special offers | **PASS** |
| Pricing presentation | **PASS** |
| Availability state | **PASS** |
| Existing badges (unavailable) | **PASS** |
| Browse metadata parity with QR item cards | **PASS** |
| No duplicated presentation logic | **PASS** |
| No Runtime/Projection/DTO/Storage changes | **PASS** |
| No QR regression (architecture) | **PASS** |

Dietary indicators: **N/A** — not in schema/runtime (documented data gap).

---

## 7. Test / Build Gate

| Gate | Result |
|------|--------|
| Menu + browse architecture vitest | **21/21 PASS** |
| `vite build` | **PASS** |

---

## 8. Certification

**CERTIFIED** — Self Ordering Kiosk fully adopts the shared Ordering Browse Presentation Model (`MenuBrowseArea`) without parallel presentation logic or architectural ownership violations.
