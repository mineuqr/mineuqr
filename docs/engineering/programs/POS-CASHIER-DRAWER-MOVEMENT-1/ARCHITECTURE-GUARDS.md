# ARCHITECTURE GUARDS

Source: `server/pos/__tests__/posCashierDrawerMovement.architecture.guards.test.ts`  
Updated: POS cashier CRMP guards, CRMP drawer-movement guards.

Proved:

1. POS Drawer Movement is an adapter (`this.shifts.recordDrawerMovement`).
2. POS does not persist drawer movements (no POS cash tables; journal unchanged).
3. POS calls CRMP authority (façade, not `FinancialShiftDomainService`).
4. POS requires `POS_ACCESS`.
5. POS requires `REGISTER_ADJUST`.
6. Client cashier identity cannot override authenticated identity.
7. Client restaurant identity cannot override `context.restaurantId`.
8. Client Register identity cannot bypass CRMP restaurant-scoped load.
9. Client Shift identity is a hint; CRMP rejects mismatch.
10. POS does not implement idempotency (`drawerMovementIdForRetry` stays in CRMP).
11. POS does not implement concurrency (no `expectedVersion` from client).
12. POS does not calculate expected cash (`computeExpectedCash` absent).
13. POS does not become financial authority.
14. Drawer Movement does not become Settlement (`settleCheckPaid` absent on this path).
15. Drawer Movement does not become Revenue (`grandTotal` absent).
16. Device Management is not reused as POS Terminal (`operationalDevices` absent).
17. No POS cash migration/table (`0094_` absent).
