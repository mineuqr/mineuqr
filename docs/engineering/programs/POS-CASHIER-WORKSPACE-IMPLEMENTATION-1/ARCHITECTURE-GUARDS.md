# ARCHITECTURE GUARDS

**Program:** POS-CASHIER-WORKSPACE-IMPLEMENTATION-1

| Guard | Prevents |
|-------|----------|
| `RestaurantTab` includes `cashier`; URL map + sidebar `id: "cashier"`; Dashboard mounts `CashierWorkspacePanel` | Missing tab / hidden route |
| Cashier tab is not Register Ops; Register Ops panel has no `CashierWorkspacePanel` / `trpc.pos.read` | Ownership merge |
| Panel calls `pos.read.*` not `order.read` / `getDb` / `crmp` / `pos.cashier` | Second read model; Register/shift leak |
| No `SUM(grandTotal)` / `pos_revenue` / `IdentityPlaceOrder` | Reporting / Order rewrite |
| Grant only inside `enableCashierAccess`; no `useEffect` grant; no `if (isOwner) return true` | Auto POS_ACCESS |
| V1 permissions = POS_ACCESS, SALE_CREATE, CHECK_INTAKE, SETTLEMENT_INITIATE only | Shift/refund/staff catalog creep |
| No Basic=1 / Professional=2 / POS_SEATS | Plan entitlement hardcode |
| AppLoading/Empty/Forbidden/Error + `dir={dir}` | Missing states / no RTL |

Tests: `client/src/lib/cashier-workspace/__tests__/cashierWorkspace.architecture.guards.test.ts`
