# INV-01 — Orders Workspace UI Inventory

**Program:** ORDERS-WORKSPACE-1  
**Type:** Architecture Investigation (read-only)  
**Date:** 2026-06-26  
**Evidence basis:** Source inspection of `client/src/` and `server/routers.ts`

---

## Executive Summary

The owner **Orders Workspace** is not a standalone module. It is the `orders` tab inside the monolithic `Dashboard.tsx` page, hosted under the restaurant dashboard shell. There is no dedicated orders route file, no orders-specific React context, and no global order store. State is local React state plus tRPC React Query cache.

---

## Routes

| Route | Component | Owner | Responsibility | Layer |
|-------|-----------|-------|----------------|-------|
| `/dashboard` | `client/src/pages/Dashboard.tsx` | Presentation | Restaurant list or last-selected restaurant | UI |
| `/dashboard/:section` | `Dashboard.tsx` | Presentation | `:section` = numeric restaurant ID **or** tab name (e.g. `sessions`) | UI |
| `/dashboard?restaurant={id}&section=orders` | `Dashboard.tsx` → `OrdersTab` | Presentation | Canonical Orders Workspace URL | UI |
| `/dashboard/sessions?restaurant={id}` | `Dashboard.tsx` → `SessionsWorkspacePanel` | Presentation | Sessions tab (order-adjacent) | UI |
| `/dashboard/templates/:restaurantId` | `TemplateSelector` | Presentation | Template picker (not orders) | UI |

**URL builder:** `client/src/lib/dashboardUrl.ts` — `section=orders` maps to `RestaurantTab` `"orders"` (lines 15–17, 79–82).

**Customer order routes (out of owner workspace scope, listed for boundary clarity):**

| Route | File | Layer |
|-------|------|-------|
| `/menu/:slug/order/:trackingToken` | `client/src/pages/OrderStatusPage.tsx` | UI (guest) |
| `/menu/:slug/order/:trackingToken/confirmed` | `client/src/pages/OrderConfirmationPage.tsx` | UI (guest) |
| `/menu/:slug/table/:tableNumber` | `client/src/pages/TableOrderingShell.tsx` | UI (guest) |

---

## Pages

| Item | Path | Owner | Responsibility | Layer |
|------|------|-------|----------------|-------|
| Dashboard (host) | `client/src/pages/Dashboard.tsx` | Presentation | Shell, tab routing, inline `OrdersTab`, `ReportsTab`, home snapshot | UI |
| App route registration | `client/src/App.tsx` (lines 60–62) | Presentation | Wouter route mounting | UI |

---

## Layouts

| Item | Path | Owner | Responsibility | Layer |
|------|------|-------|----------------|-------|
| `RestaurantOperationsShell` | `client/src/components/dashboard/layout/RestaurantOperationsShell.tsx` | Presentation | Sidebar + header + main content | UI |
| `RestaurantDashboardSidebar` | `client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx` | Presentation | Workspace nav: Home, Sessions, **Orders**, Reports (lines 77–107) | UI |
| `RestaurantSidebarProvider` | `client/src/components/dashboard/layout/RestaurantSidebarProvider.tsx` | Presentation | Sidebar collapse (localStorage) | UI |
| `RestaurantShellHeaderActions` | `client/src/components/dashboard/layout/RestaurantShellHeaderActions.tsx` | Presentation | Header actions; polls `notification.getUnread` | UI |
| Layout types | `client/src/components/dashboard/layout/types.ts` | Presentation | `RestaurantTab` includes `"orders"` | UI |
| Dashboard styles | `client/src/components/dashboard/restaurantDashStyles.ts` | Presentation | Shared visual tokens | UI |

---

## Dialogs / Sheets

| Item | Path | Owner | Responsibility | Layer |
|------|------|-------|----------------|-------|
| `DiningSessionWorkspaceSheet` | `client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx` | Presentation | Session drill-down from order card; polls `session.getOwnerWorkspace` + `order.list` | UI |
| `DiningSessionActionBar` | `client/src/components/dashboard/DiningSessionActionBar.tsx` | Presentation | Session settlement actions; invalidates `order.list` | UI |
| `DiningSessionWorkspaceRecovery` | `client/src/components/dashboard/DiningSessionWorkspaceRecovery.tsx` | Presentation | Sheet error/skeleton states | UI |
| `AlertDialog` (session actions) | Used inside `DiningSessionActionBar` | Presentation | Confirm mark-paid / close session | UI |
| `VerificationRequiredPanel` | `client/src/components/auth/VerificationRequiredPanel.tsx` | Presentation | Blocks orders when email unverified (`variant="orders"`) | UI |
| `OrderAlertSystem` | `client/src/components/OrderAlertSystem.tsx` | Presentation | Global new-order popup overlay (not a dialog primitive) | UI |

**No dedicated order detail dialog or order confirmation dialog exists in the Orders tab.**

---

## Orders Tab Components (inline in Dashboard.tsx)

| Item | Location | Owner | Responsibility | Layer |
|------|----------|-------|----------------|-------|
| `OrdersTab` | `Dashboard.tsx` lines 3842–4108 | Presentation | Live order list, status filters, action buttons, session link | UI |
| Status filter chips | `OrdersTab` lines 3909–3927 | Presentation | View filter: `all \| pending \| preparing \| ready \| served \| cancelled` | View State |
| Order card list | `OrdersTab` lines 3939–4091 | Presentation | Renders order fields, line items, action buttons | UI |
| `buildOrderStatistics` | `Dashboard.tsx` lines 3450–3480 | Presentation | **Client-side KPI computation** (ADR violation) | Invalid — business logic in UI |
| `buildMonthlyReport` / `buildYearlySummary` | `Dashboard.tsx` lines 3494–3528 | Presentation | Reports analytics derivation | Invalid — business logic in UI |
| `OperationalSnapshotSection` | `Dashboard.tsx` lines 901+ | Presentation | Home KPIs from `order.list` + `ops.getRestaurantOverview` | UI |
| `ReportsTab` | `Dashboard.tsx` lines 3532+ | Presentation | Order analytics + settlement sections | UI |

---

## Shared / Adjacent Dashboard Components

| Item | Path | Orders relevance | Layer |
|------|------|------------------|-------|
| `DiningSessionOrdersSummarySection` | `client/src/components/dashboard/DiningSessionOrdersSummarySection.tsx` | Order count/total in session sheet | UI |
| `DiningSessionOrdersList` | `client/src/components/dashboard/DiningSessionOrdersList.tsx` | **Orphan — no imports found** | UI (unused) |
| `DiningSessionTimelineList` | `client/src/components/dashboard/DiningSessionTimelineList.tsx` | Session events including order events | UI |
| `ActiveSessionsTableSection` | `client/src/components/dashboard/ActiveSessionsTableSection.tsx` | Joins `order.list` with ops board | UI |
| `SessionsWorkspacePanel` | `client/src/components/dashboard/SessionsWorkspacePanel.tsx` | Sessions tab; polls `order.list` for KPIs | UI |
| `OperationalActivityFeedSection` | `client/src/components/dashboard/OperationalActivityFeedSection.tsx` | `order_created`, `order_status_changed` events | UI |
| `OperationalBoardCard` | `client/src/components/dashboard/OperationalBoardCard.tsx` | Table cards with `totalOrders` / `pendingOrders` | UI |
| `RestaurantKpiCard` | `client/src/components/dashboard/RestaurantKpiCard.tsx` | KPI display primitive | UI |
| `SettlementOverviewSection` | `client/src/components/dashboard/SettlementOverviewSection.tsx` | Reports tab settlement KPIs | UI |
| `SettlementTrendsSection` | `client/src/components/dashboard/SettlementTrendsSection.tsx` | Reports tab trends | UI |

---

## Customer-Facing Order Components (not owner workspace)

| Item | Path | Layer |
|------|------|-------|
| `OrderStatusStepper` | `client/src/components/customer/OrderStatusStepper.tsx` | UI (guest) |
| `OrderReceivedHero` | `client/src/components/customer/OrderReceivedHero.tsx` | UI (guest) |
| `OrderTrackingExpired` | `client/src/components/customer/OrderTrackingExpired.tsx` | UI (guest) |

---

## Hooks

| Hook | Path | Used by Orders Workspace | Layer |
|------|------|--------------------------|-------|
| `useAuth` | `client/src/_core/hooks/useAuth.ts` | Query gating | UI |
| `useAuthGate` | `client/src/_core/hooks/useAuthGate.ts` | Dashboard login gate | UI |
| `useLanguage` | `client/src/contexts/LanguageContext.tsx` | i18n / RTL | UI |
| `useCommercialFeatureVisibility` | `client/src/hooks/useCommercialFeatureVisibility.ts` | Reports tab gating | UI |
| `useDevQueryRuntimeLog` | `client/src/lib/queryRuntime.ts` | DEV poll diagnostics | UI |
| `useRoute` / `useLocation` | wouter | Dashboard URL parsing | UI |

**No `useOrders` hook exists.**

---

## Contexts / Providers

| Provider | Path | Scope | Layer |
|----------|------|-------|-------|
| `LanguageContext` | `client/src/contexts/LanguageContext.tsx` | App-wide i18n | UI |
| `ThemeContext` | `client/src/contexts/ThemeContext.tsx` | App theme | UI |
| `RestaurantSidebarProvider` | layout | Sidebar collapse | UI |
| tRPC React Query | `client/src/lib/trpc.ts` | Server state cache | Infrastructure (client) |

---

## State Stores

| Store | Mechanism | Keys / State | Layer |
|-------|-----------|--------------|-------|
| React Query (tRPC) | `trpc.order.list`, `trpc.order.updateStatus`, etc. | Cached order payloads | Projection cache |
| `OrdersTab` local state | `useState` | `statusFilter`, `timelineSessionId` | View State |
| `Dashboard` local state | `useState` | `restaurantTab`, `selectedRestaurantId` | View State |
| `OrderAlertSystem` local state | `useState` + refs | `alerts[]`, `soundEnabled`, `lastSeenIdRef` | View State |
| `sessionStorage` | `dashboard:lastRestaurantId` | Restaurant persistence | View State |
| `localStorage` | `restaurantSidebarStorage.ts` | Sidebar open state | View State |

**No Zustand, Redux, or dedicated order store.**

---

## Supporting Libraries

| File | Responsibility | Layer |
|------|----------------|-------|
| `client/src/lib/dashboardUrl.ts` | URL parse/build for dashboard tabs | UI utility |
| `client/src/lib/orderStatusDisplay.ts` | Shared status labels and lifecycle steps | Presentation copy |
| `client/src/lib/diningSessionDashboardCopy.ts` | Session labels/counts on order cards | Presentation copy |
| `client/src/lib/diningSessionWorkspaceView.ts` | Settlement derivation, item counts | **Projection derivation in client** |
| `client/src/lib/sessionWorkspaceOps.ts` | Operational board derivations from `order.list` | **Projection derivation in client** |
| `client/src/lib/queryRuntime.ts` | Poll intervals (`DASHBOARD_ORDER_LIST_POLL_MS = 10_000`) | UI infrastructure |
| `client/src/lib/excel.ts` | Sales report Excel export | UI utility |
| `client/src/lib/notificationSound.ts` | Order alert sound | UI utility |

---

## Architectural Layer Summary

| Layer | Artifacts in scope |
|-------|-------------------|
| **UI (Presentation)** | `OrdersTab`, dashboard shell, sheets, alerts, badges, filters |
| **View State** | `statusFilter`, `timelineSessionId`, sidebar collapse, alert overlay |
| **Projection State (client-derived)** | `buildOrderStatistics`, `buildMonthlyReport`, `deriveSettlementSummary`, `countSessionItems` |
| **Domain State (authoritative, server)** | Order `status` field from `order.list` / `order.updateStatus` — **not owned by UI** |
| **Application / Infrastructure** | tRPC transport, React Query cache — no direct domain access from client |

---

## Key Finding

The Orders Workspace is embedded in a 4,400+ line `Dashboard.tsx` file with no module boundary. Operational order management (`OrdersTab`) coexists with reports analytics, menu management, and settings in a single presentation file.
