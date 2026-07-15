# WAITER-NAVIGATION-ADOPTION-1 — Engineering Report

**Program:** WAITER-NAVIGATION-ADOPTION-1  
**Type:** Presentation Adoption  
**Date:** 2026-07-15  
**Decision:** **PRESENTATION ADOPTION CERTIFIED**  
**Depends on:** WAITER-ORDERING-PLATFORM-ARCHITECTURE-1, WAITER-ORDERING-FOUNDATION-1, WAITER-SESSION-FORENSICS-1  

---

## 1. Navigation Audit

| Surface | Role | Waiter entry decision |
|---------|------|------------------------|
| `RestaurantDashboardSidebar` Workspace group | Canonical restaurant ops nav | **Adopt here** — single entry |
| Menu management group | Catalog/tables/QR | Not used (Waiter is ops channel, not menu CRUD) |
| `RestaurantHeaderCard` Preview Menu | External channel (`window.open` `/menu/:slug`) | Not duplicated — sidebar is enough |
| Dashboard home / restaurants list | No restaurant context | No entry (slug unknown) |
| Mobile | Same sidebar via Sheet | Covered by Workspace item |
| `/kiosk` / `/screen` | No sidebar deep-links today | Waiter follows Workspace external-nav pattern (not a new `RestaurantTab`) |

**Canonical target:** `/waiter/:slug/tables` when slug known; fallback `/waiter` picker.

**Rationale:** Matches WaiterShell landing after select; reuses registered routes; does not invent a dashboard tab or second App route.

---

## 2. Files Modified

| File | Change |
|------|--------|
| `client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx` | Workspace nav item → existing Waiter Shell |
| `client/src/components/dashboard/layout/RestaurantOperationsShell.tsx` | Pass `restaurantSlug` |
| `client/src/pages/Dashboard.tsx` | Supply `sidebarRestaurant?.slug` |
| `client/src/components/dashboard/layout/__tests__/waiterNavigationAdoption.architecture.guards.test.ts` | Guards |
| `docs/engineering/programs/WAITER-NAVIGATION-ADOPTION-1/IMPLEMENTATION.md` | This report |

**Unchanged (constraint):** WaiterShell, Ordering Platform, Session Platform, BI, Client Platform, App waiter routes.

---

## 3. Navigation Integration

```
Dashboard (restaurant-detail)
  → Workspace sidebar “Waiter Ordering” / “طلب النادل”
  → setLocation(`/waiter/${slug}/tables`)  // or `/waiter`
  → existing WaiterShell
  → table select → session attach → Ordering Client Platform
```

- Reuses `SidebarMenuButton` + lucide `ConciergeBell` (same pattern as other Workspace items).
- Not a `RestaurantTab` — leaves dashboard into the existing App channel shell (same class of surface as visiting `/menu/:slug`, without adding a second route family).

---

## 4. Permission Validation

| Layer | Behaviour |
|-------|-----------|
| Dashboard | Already auth-gated; Workspace items only when `restaurant-detail` |
| Nav visibility | Same audience as Sessions/Orders (restaurant owners in console) — no new permission system |
| WaiterShell | Unchanged `useAuth` + restaurant access checks |
| APIs | Unchanged `protected`/`verified` + `assertRestaurantAccess` |

No waiter-specific entitlement flags introduced.

---

## 5. Routing Validation

| Step | Status |
|------|--------|
| No new App routes | Pass — still 7 `/waiter*` registrations |
| Deep-link to tables | Pass — `/waiter/:slug/tables` |
| Fallback picker | Pass — `/waiter` if slug missing |
| No redirect hacks in Dashboard | Pass — direct `setLocation` |
| WaiterShell / session / place path | Unchanged |

---

## 6. Regression Analysis

| Area | Risk | Mitigation |
|------|------|------------|
| Dashboard tabs | Low | New item is external navigate; no tab union change |
| Waiter channel | None | Shell/APIs untouched |
| Duplicate nav | Low | Single Workspace row only |
| Mobile sidebar | Low | Same Sheet sidebar |

---

## 7. Acceptance Validation

| Criterion | Status |
|-----------|--------|
| Discoverable from restaurant UI | **PASS** |
| Opens existing Waiter Shell | **PASS** |
| No manual URL required | **PASS** |
| Auth continues | **PASS** |
| Restaurant auth continues | **PASS** |
| WaiterShell unchanged | **PASS** |
| Session / Ordering / BI unchanged | **PASS** |
| No duplicated routes | **PASS** |
| No duplicated navigation | **PASS** |
| No ownership violations | **PASS** |

---

## 8. Certification

**PRESENTATION ADOPTION CERTIFIED.**

Waiter Ordering is discoverable from the restaurant Workspace sidebar while preserving the existing platform architecture and the certified Waiter channel routes.
