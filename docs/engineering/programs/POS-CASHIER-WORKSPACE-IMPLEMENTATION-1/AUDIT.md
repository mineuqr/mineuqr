# REPOSITORY AUDIT

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1  
Short implementation audit. No new architecture.

## Dashboard

| Surface | Location | Finding |
|---------|----------|---------|
| Tab union | `client/src/components/dashboard/layout/types.ts` | Add `"cashier"` to `RestaurantTab` |
| URL | `client/src/lib/dashboardUrl.ts` | `?section=cashier` via existing map |
| Navigation SSOT | `client/src/lib/useDashboardNavigation.ts` | Reuse; URL remains SSOT |
| Sidebar | `RestaurantDashboardSidebar.tsx` | Insert Cashier after Orders, before Settlements / Register Ops |
| Render | `client/src/pages/Dashboard.tsx` | `activeTab === "cashier"` → `CashierWorkspacePanel` |
| Shell | `RestaurantOperationsShell` | Unchanged |
| States | `AppLoadingState` / `AppEmptyState` / `AppErrorState` / `AppForbiddenState` | Reuse |
| Tokens | `restaurantDash` | Reuse |

Register Operations remains `RegisterOperationsPanel` on `register`. Cashier is not a top-level `/pos` app.

## POS reads (must consume)

`pos.read.orders.listActive` · `getDetail` · `getTimeline`  
`pos.read.orderSettlement.listByOrder`  
`pos.read.catalog.listItems`

Catalog DTO has `categoryId` but **no category name**. Group by id only.

## Existing POS commands (integrate, do not invent)

| Command | Auth | Use in V1 |
|---------|------|-----------|
| `pos.sale.create` | `POS_ACCESS` + `SALE_CREATE` | Place ticket |
| `pos.check.intake` | `CHECK_INTAKE` | Open check |
| `pos.settlement.initiate` | `SETTLEMENT_INITIATE` | Start settlement (may require open register shift) |
| `pos.terminal.list/register/activate` | owner/admin restaurant access | Terminal picker / occupancy-certified create |
| `pos.access.context` | POS scope + terminal | Gate workspace |
| `pos.access.grant` | owner/admin | **Explicit** owner-testing seam only — never on load |

Do not put `pos.cashier.*` / CRMP shift commands in Cashier.

## Ownership (unchanged)

Order = operational SSOT · Check = financial authority · Settlement = Check-owned · Reporting = Paid Check `grandTotal` · POS = terminal-authorized presentation.

## Auth seam

Dashboard access ≠ `POS_ACCESS`. Owner/Admin do not inherit cashier access. Staff Access is deferred; Cashier is ready to consume Staff → POS_ACCESS → terminal → session later.
