# OPERATIONAL-WORKSPACE-1 — Certification Report

**Date:** 2026-07-04  
**Program:** OPERATIONAL-WORKSPACE-1  
**Architecture basis:** Architecture Constitution, ORDER-1, READ-ARCHITECTURE-1, ORDERS-READ-MODEL-1, KITCHEN-DISPLAY-ARCHITECTURE-1 Revision B, KITCHEN-DISPLAY-1 (CERTIFIED)  
**Status:** **CERTIFIED**

---

## 1. Implementation Summary

MineuQR operational surfaces (Orders, Kitchen, Print) now share a unified **Operational Workspace** pattern: Workspace → KPIs → Operations Bar → Filters → Operational Grid → Details Drawer. **Orders Workspace** is the sole owner of order lifecycle actions (Accept, Start Preparing via accept, Mark Ready, Serve, Cancel). **Kitchen Workspace** is execution-only visualization over Q-20 with no lifecycle mutations. **Print Workspace** adopts the shared Operations Bar and saved filter presets while retaining print-specific setup flows. Shared SLA engine, delay intelligence, operational cards, timeline (P-04), and 45-second grace period provide consistent enterprise-grade operator UX without new persistence, projection consumers, or domain boundary changes.

---

## 2. Repository Integration

| Integration | Mechanism |
|-------------|-----------|
| Order read projections | `order.read.listActive`, `getDetail`, `getTimeline` over `order_read_*` (P-02, P-04) |
| Order commands | `order.updateStatus` via shared `useOrderStatusActions` |
| Kitchen queue | Q-20 `kitchen.read.getQueue` (P-07 logical context, unchanged) |
| Print workspace | `printWorkspace.read.listOrders` + operational print status |
| Authorization | `verifiedProcedure` + `assertRestaurantAccess` |
| React Query | Shared invalidation: `order.list`, `order.read.listActive`, `kitchen.read.getQueue`, `printWorkspace.read.listOrders` |
| Dashboard | `OrdersWorkspacePanel` replaces inline `OrdersTab` render |

---

## 3. Files Added

| Path | Purpose |
|------|---------|
| `client/src/lib/operational-workspace/slaEngine.ts` | SLA targets, urgency tiers, snapshots |
| `client/src/lib/operational-workspace/delayIntelligence.ts` | Human-readable delay reasons |
| `client/src/lib/operational-workspace/operationalActions.ts` | Action-first labels; Orders vs Kitchen ownership |
| `client/src/lib/operational-workspace/useOrderStatusActions.ts` | Shared status mutations + cache invalidation |
| `client/src/lib/operational-workspace/useSavedFilters.ts` | Saved filter presets (localStorage) |
| `client/src/lib/operational-workspace/useGracePeriod.ts` | 45s fade for completed items |
| `client/src/lib/operational-workspace/orderViewModels.ts` | Order card SLA helpers |
| `client/src/lib/operational-workspace/__tests__/*.test.ts` | SLA, actions, delay, grace tests |
| `client/src/components/operational-workspace/OperationalWorkspaceShell.tsx` | Unified workspace layout |
| `client/src/components/operational-workspace/OperationsBar.tsx` | Reusable operations summary bar |
| `client/src/components/operational-workspace/WorkspaceFilters.tsx` | Saved filter preset UI |
| `client/src/components/operational-workspace/OperationalCard.tsx` | Large touch-friendly operational card |
| `client/src/components/operational-workspace/SlaIndicator.tsx` | Elapsed / target / late display |
| `client/src/components/operational-workspace/DelayExplanation.tsx` | Why-is-this-late messaging |
| `client/src/components/operational-workspace/OperationalTimeline.tsx` | P-04 timeline reuse |
| `client/src/components/operational-workspace/OperationalDetailsDrawer.tsx` | Shared details drawer |
| `client/src/components/orders-workspace/OrdersWorkspacePanel.tsx` | Orders operational workspace |
| `server/order/read/infrastructure/DrizzleOrderOperationalReadStore.ts` | Read store over projections |
| `server/order/read/services/OrderReadWorkspaceService.ts` | Q-01/Q-03/Q-04 workspace service |
| `server/order/read/orderReadRouter.ts` | tRPC read router |
| `server/order/read/__tests__/OrderReadWorkspaceService.test.ts` | Service unit tests |
| `server/order/read/__tests__/operationalWorkspaceArchitecture.test.ts` | Architecture guards |

---

## 4. Files Modified

| Path | Change |
|------|--------|
| `client/src/pages/Dashboard.tsx` | Renders `OrdersWorkspacePanel` for orders tab |
| `client/src/components/kitchen/KitchenWorkspacePanel.tsx` | Unified shell; execution-only cards; grace period |
| `client/src/components/print-workspace/PrintWorkspacePanel.tsx` | Operations Bar + saved filters |
| `client/src/lib/kitchen/useKitchenActions.ts` | Deprecated re-export of `useOrderStatusActions` |
| `client/src/lib/queryRuntime.ts` | `orderReadListQueryOptions` |
| `server/routers.ts` | Nested `order.read` router |

---

## 5. UX Improvements

- **Unified layout** across Orders and Kitchen (Print orders section aligned via Operations Bar + filters)
- **Action-first UX** — operators see Accept Order / Mark Ready / Serve Order, not raw status names
- **Large operational cards** with product summary, notes, SLA, and delay explanations
- **Operations Bar** surfaces needs-acceptance, preparing, ready, late, kitchen backlog, print queue counts
- **Saved filters** — My Orders presets (pending/preparing/ready/late), Kitchen Queue, Print views
- **Details drawer** with P-04 operational timeline
- **Grace period** — completed/removed cards fade over 45s for operator verification
- **Kitchen execution hint** — cards direct operators to Orders Workspace for lifecycle actions

---

## 6. Operational Improvements

| Requirement | Implementation |
|-------------|----------------|
| Orders owns lifecycle | `getOrderWorkspaceActions` + `useOrderStatusActions` only in Orders panel |
| Kitchen execution-only | `executionOnly` cards; `getKitchenWorkspaceActions` returns `[]` |
| SLA engine | `computeSlaSnapshot` with certified thresholds (300/900/300s) |
| Delay intelligence | `explainDelay` — waiting acceptance, SLA exceeded, ready-not-served, printing failed |
| Timeline | `OperationalTimeline` from `order.read.getDetail` / P-04 events |
| Restore Order | Omitted — domain `OrderLifecyclePolicy` has no restore transitions |
| Accessibility | min-h-11 touch targets, keyboard-focusable filters, high-contrast urgency borders |

---

## 7. Performance Validation

- **No N+1** — list queries batch line items in read store; kitchen composes from single queue query
- **Existing queries reused** — no new projection consumers
- **Shared React Query caches** — coordinated invalidation on status mutation
- **Polling unchanged** — 10s list refresh via `queryRuntime` options
- **Grace period** — client-only Map; no extra network requests

---

## 8. Architecture Compliance

| Rule | Status |
|------|--------|
| Order remains Core Domain | ✅ Lifecycle via `order.updateStatus` only |
| Kitchen = Operational Service | ✅ Q-20 read-only; no kitchen tables/consumer |
| Print = Operational Service | ✅ Print setup + read APIs unchanged |
| P-07 unchanged | ✅ `queryable`, `consumerName: null` |
| Q-20 unchanged | ✅ Kitchen router untouched |
| Read Architecture unchanged | ✅ `order.read.*` reads `order_read_*` projections only |
| No new persistence | ✅ Timeline from P-04; filters in localStorage |
| No ADR reopening | ✅ UX layer only |

---

## 9. Test Results

```
client/src/lib/operational-workspace/__tests__   14/14 passed
server/order/read/__tests__/OrderReadWorkspaceService.test.ts   2/2 passed
server/order/read/__tests__/operationalWorkspaceArchitecture.test.ts   4/4 passed
server/kitchen/read/__tests__                    18/18 passed (regression)
```

Validated: action ownership, workspace consistency guards, SLA calculations, delay explanations, grace period contract, order read service pagination, P-07 registry state.

---

## 10. Final Certification

**OPERATIONAL-WORKSPACE-1 is CERTIFIED.**

The implementation delivers a cohesive Operational Workspace platform: one reusable UX system across Orders, Kitchen, and Print; action-first operator flows with Orders as lifecycle owner; execution-focused Kitchen visualization; shared SLA, delay, timeline, and grace-period behavior — all on top of the certified read and event architecture without boundary violations.
