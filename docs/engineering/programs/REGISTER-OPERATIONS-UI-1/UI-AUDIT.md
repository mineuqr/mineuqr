# REGISTER-OPERATIONS-UI-1 — UI Adoption Audit (Reopened)

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-UI-1 (REOPENED) |
| **Date** | 2026-07-24 |
| **Prerequisite** | CRMP-OPERATIONS-API-1 certified |

---

## Insertion decision

| Host | Status | Placement |
|------|--------|-----------|
| **Restaurant Manager** | **Ship** | Dashboard Workspace tab `register` → `/dashboard?restaurant={id}&section=register` |
| **Settlement Station / Counter POS** | Presentation mode on Manager host | Touch-first “Station mode” in the same panel (tablet/landscape). Dedicated operational-screen role requires backend role (out of scope). |
| Kitchen / Expo / Waiter / Kiosk / QR | **Excluded** | Not mounted |

## Reuse

| Asset | Reuse |
|-------|-------|
| Dashboard shell / sidebar | Extend `RestaurantTab` + sidebar item near Settlements |
| Presentation package pattern | Mirror `settlement-record-presentation` |
| Visual tokens | `restaurantDash` |
| tRPC | `trpc.crmp.register.*` only |

## Gaps (non-blocking)

| Gap | Handling |
|-----|----------|
| No Settlement Station device role | Station mode UI on Manager host; no backend |
| No Register provision API | Empty state when catalog empty |
| No Financial Shift write API | Show shift **reference** only |
| No Settlement Context query on `crmp.register` | Show Duty + Shift presence from certified reads only |

**Proceed — no STOP.**
