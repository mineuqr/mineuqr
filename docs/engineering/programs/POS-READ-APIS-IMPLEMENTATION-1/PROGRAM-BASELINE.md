# PROGRAM BASELINE

**Program:** POS-READ-APIS-IMPLEMENTATION-1  
**Status:** AUTHORIZED — IMPLEMENTATION  
**HEAD at start:** `761e08afd913e0492c372d7ea40cbed01f22b100` (`fix(device): use runtime business tenant scope`)  
**Branch:** `main` = `origin/main`  
**Working tree at start:** clean  
**Git during program:** no commit, no push, no deploy

## Phase 0

| Check | Result |
|-------|--------|
| `git status --short` | empty at start |
| branch | `main` |
| HEAD | `761e08afd913e0492c372d7ea40cbed01f22b100` |
| `origin/main` | same |

## Certified predecessors (TypeScript / occupancy)

| Item | State |
|------|--------|
| Commercial Occupancy | CERTIFIED / UNCHANGED |
| TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1 | 27 remaining, all classified |
| P0 | 0 |
| P1 | 0 |
| FIX_BEFORE_POS_READ_APIS | 0 |
| UNCLASSIFIED | 0 |
| POS_READ_API_BLOCKERS | 0 |
| TS2802 | 0 |
| App.tsx | 0 |

## Independent TypeScript measurement at this HEAD (before POS source)

`pnpm check` at this program’s completion still reports **27** diagnostics. They match TDA-001…012, 014…028 from TYPESCRIPT-REMAINING-TECHNICAL-DEBT-AUDIT-1. None are in `server/pos/**`.

## Architecture documents inspected

ORDER-1 / ADR-ARCH-001 · ADR-ARCH-002 · ADR-ARCH-003  
READ-ARCHITECTURE-1 (RA-01…RA-07, especially RA-03 query catalog, RA-05 read service boundaries, RA-07 refresh)  
ORDERS-READ-MODEL-1  
ORDERING-PLATFORM-ARCHITECTURE-1 / ORDERING-CLIENT-GOVERNANCE-1 / ADR-ARCH-018  
DEVICE-MANAGEMENT-1 (`operationalDevice.runtime.*`)  
KITCHEN-DISPLAY-ARCHITECTURE-1 (`getKitchenQueue`)  
WAITER-ORDERING-PLATFORM-ARCHITECTURE-1  
REPORTING-ARCHITECTURE-1 (`reporting.*`, Revenue = Paid Check `grandTotal`)  
CHECK-MANAGEMENT-ARCHITECTURE-1  
ADR-ARCH-021 (event idempotency)  
ADR-ARCH-022 (Order Settlement Platform)  
POS-TERMINAL-ACCESS-IMPLEMENTATION-1  
POS-SALE-ORDER-IMPLEMENTATION-1  
POS-CHECK-INTAKE-IMPLEMENTATION-1  
POS-REGISTER-SHIFT-IMPLEMENTATION-1

## Code inspected (not assumed from docs)

- `server/order/read/orderReadRouter.ts` — owner/admin via `assertRestaurantAccess`
- `server/order/read/services/OrderReadWorkspaceService.ts` + `DrizzleOrderOperationalReadStore`
- `server/operational-session/check/api/orderSettlementReadRouter.ts`
- `server/reporting-platform/reportingRouter.ts`
- `server/operational-device/routers/operationalDeviceRuntimeRouter.ts`
- `server/pos/api/posRouter.ts` + `PosAccessService` + `assertRestaurantPosScope`
- `server/db.ts` `getMenuItemsByRestaurant`

## Gap this program fills

POS grant cashiers cannot call `order.read.*` or `orderSettlement.*` (those require owner/admin `assertRestaurantAccess`). POS needs a **terminal-authorized façade** that **delegates** to those canonical read services. POS does not become the Order, Check, Settlement, or Reporting owner.
