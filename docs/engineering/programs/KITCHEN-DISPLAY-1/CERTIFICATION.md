# KITCHEN-DISPLAY-1 — Certification Report

**Date:** 2026-07-04  
**Program:** KITCHEN-DISPLAY-1  
**Architecture basis:** KITCHEN-DISPLAY-ARCHITECTURE-1 Revision B (CERTIFIED)  
**Status:** **CERTIFIED**

---

## 1. Implementation Summary

Kitchen Display is implemented as an Operational Service under `server/kitchen/read/`. P-07 is a **logical operational read context** composing tickets from certified order read projections (P-02 headers, P-04 timeline, line items). Q-20 `kitchen.read.getQueue` serves the kitchen queue. The dashboard **Kitchen Display** tab renders three columns (New / Preparing / Ready) with actions routed through existing `order.updateStatus`. Queue ordering uses the `QueueOrderingPolicy` abstraction with v1 default `FifoByCreatedAtPolicy`. No `kitchen_read_*` tables, no kitchen projection consumer, no kitchen domain.

---

## 2. Files Added

| Path | Purpose |
|------|---------|
| `server/kitchen/read/contracts/kitchenQueryContracts.ts` | Q-20 DTOs and constants |
| `server/kitchen/read/domain/ordering/QueueOrderingPolicy.ts` | Ordering policy interface |
| `server/kitchen/read/domain/ordering/FifoByCreatedAtPolicy.ts` | v1 FIFO policy |
| `server/kitchen/read/infrastructure/OrderReadQueryAdapter.ts` | Read port over `order_read_*` |
| `server/kitchen/read/services/KitchenTicketComposer.ts` | Ticket composition + urgency |
| `server/kitchen/read/services/KitchenReadService.ts` | P-07 logical read service |
| `server/kitchen/read/kitchenRouter.ts` | tRPC Q-20 router |
| `server/kitchen/read/kitchenReadComposition.ts` | Module exports |
| `server/kitchen/read/__tests__/*.test.ts` | Unit + architecture guards |
| `client/src/lib/kitchen/types.ts` | Client queue types |
| `client/src/lib/kitchen/viewModels.ts` | Ticket card mapping |
| `client/src/lib/kitchen/useKitchenActions.ts` | Status mutations + invalidation |
| `client/src/lib/kitchen/__tests__/viewModels.test.ts` | Client view model tests |
| `client/src/components/kitchen/KitchenWorkspacePanel.tsx` | Kitchen workspace UI |
| `client/src/components/kitchen/KitchenColumn.tsx` | Column layout |
| `client/src/components/kitchen/KitchenTicketCard.tsx` | Ticket card + actions |

---

## 3. Files Modified

| Path | Change |
|------|--------|
| `server/routers.ts` | Register `kitchenRouter`; extend `order.updateStatus` response |
| `server/order/read/projections/lifecycle/ProjectionLifecycleRegistry.ts` | P-07 → `queryable`, `consumerName: null` |
| `server/order/read/projections/lifecycle/__tests__/ProjectionLifecycleRegistry.test.ts` | Updated P-07 expectations |
| `client/src/pages/Dashboard.tsx` | Kitchen tab + panel |
| `client/src/components/dashboard/layout/types.ts` | `kitchen` tab type |
| `client/src/components/dashboard/layout/RestaurantDashboardSidebar.tsx` | Kitchen nav item |
| `client/src/lib/dashboardUrl.ts` | `kitchen` section mapping |
| `client/src/lib/queryRuntime.ts` | `kitchenQueueQueryOptions` |

---

## 4. Repository Integration

| Integration | Mechanism |
|-------------|-----------|
| Order read projections | `DrizzleOrderReadQueryAdapter` reads P-02/P-04/line items |
| Order commands | `order.updateStatus` via `AdvanceOrderStatusService` |
| Authorization | `verifiedProcedure` + `assertRestaurantAccess` |
| Event pipeline | Unchanged — kitchen has no materialization consumer |
| Dashboard shell | New `kitchen` tab alongside print workspace |
| React Query | 10s poll + invalidation on status mutation |

---

## 5. Test Results

```
server/kitchen/read/__tests__         18/18 passed
client/src/lib/kitchen/__tests__       3/3 passed
ProjectionLifecycleRegistry.test.ts    4/4 passed
PrintWorkspaceReadService.test.ts      4/4 passed
```

Coverage includes: ticket composition, `statusEnteredAt` derivation, urgency tiers, FIFO ordering, status filtering, queue limit, architecture guards (no write-model reads, no kitchen tables/consumer, P-07 queryable), client view models.

---

## 6. Performance Validation

| Check | Result |
|-------|--------|
| N+1 avoidance | Pipeline orders fetched in one query; line items batch `inArray`; timelines batch `inArray` |
| Payload bound | Q-20 limit max 200 |
| Poll interval | 10s (`kitchenQueueQueryOptions`) |
| Query round trips | 3 (orders + line items + timelines) — same class as print workspace |

---

## 7. Architectural Compliance

| Requirement | Status |
|-------------|--------|
| Order is only Core Domain | ✅ |
| Kitchen Operational Service (not domain) | ✅ |
| P-07 logical read context over order read models | ✅ |
| No `kitchen_read_*` tables | ✅ |
| No `KitchenQueueProjectionConsumer` | ✅ |
| Q-20 reads projections only | ✅ |
| QueueOrderingPolicy + FIFO v1 default | ✅ |
| Printing independent | ✅ |
| Integration/projection separation preserved | ✅ |

---

## 8. Operational Validation

| Scenario | Expected behavior |
|----------|-------------------|
| New order in pipeline | Appears in New column after P-02 materialization + poll |
| Start Preparing | `order.updateStatus` → Preparing column after invalidation/poll |
| Mark Ready | `order.updateStatus` → Ready column |
| Mark Served | Ticket removed from queue (P-02 inactive) |
| Multi-screen | Shared P-07 logical state via same Q-20 |
| Tenant isolation | `restaurantId` required; `assertRestaurantAccess` enforced |

---

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Projection lag up to 10s poll | Mutation invalidation + manual refresh button |
| P-04 missing timeline entry | `statusEnteredAt` falls back to `createdAt` |
| `order.updateStatus` returns extended fields | Backward compatible — adds fields only |

---

## 10. Final Certification

**KITCHEN-DISPLAY-1 is CERTIFIED.** Implementation conforms to KITCHEN-DISPLAY-ARCHITECTURE-1 Revision B. Kitchen Display is production-ready for owner/staff operational use via the dashboard Kitchen tab.
