# ARCHITECTURE GUARDS

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
Guards test **architecture**, not formatting trivia.

## New: `posRead.architecture.guards.test.ts`

| Guard | Prevents |
|-------|----------|
| `posReadRouter` uses `verifiedProcedure` + `.query(` and no `.mutation(` | hidden writes on read APIs |
| `posRouter` mounts `read: posReadRouter` | orphan router |
| POS read files must not contain IdentityPlaceOrder, CheckService, ensureCheckForOrder, settleCheckPaid, settleOrderPaid | Order/Check write ownership leak |
| no `checkLimit` / `withCommercialLimitOccupancy` / `occupancyDelta` in POS **read** files | occupancy mutation / second occupancy path (entitlement read stays in existing `PosAccessService`) |
| no `SalesChannelAnalytics` / `getBusinessMetricsSummary` / `SUM(grandTotal)` | financial SSOT duplication |
| no `db.execute` | ad-hoc SQL from POS read layer |
| `PosOrderReadService` calls `OrderReadWorkspaceService.listActive` | second order query path |
| `PosOrderSettlementReadService` calls `listByOrder` | second settlement representation |
| catalog uses `getMenuItemsByRestaurant`, not `createMenuItem` | menu write |
| `requirePosReadContext` uses `assertRestaurantPosScope` + `resolvePosTerminalAccess` + `decision.context` | owner-only bypass / client restaurant trust |
| read router has no `assertRestaurantAccess`, `getDb`, or `getMenuItemsByRestaurant` | router-direct queries; cashiers blocked by owner-only helper |
| catalog DTO has no `imageUrl` / `toFixed` | secret/media leak; float money |

## Existing: `pos.architecture.guards.test.ts`

Still asserts POS_OWNED files (including `posRouter.ts`) do not import operational-device, CheckService, reporting-platform, or CRMP domain types. `posRouter` only **mounts** `posReadRouter`; it does not import settlement DTOs.

`posComposition.ts` is allowed to wire `orderReadWorkspaceService` and `orderSettlementReadService` (composition root, not POS_OWNED).

## Explicit non-goals for guards

- Do not freeze Order Read cursor implementation (inherited limitation).
- Do not require POS to own Kitchen filtering.
