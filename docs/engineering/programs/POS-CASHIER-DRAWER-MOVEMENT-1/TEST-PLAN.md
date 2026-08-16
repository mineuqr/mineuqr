# TEST PLAN

Targeted files:

- `server/pos/__tests__/posCashierDrawerMovement.operations.test.ts`
- `server/pos/__tests__/posCashierDrawerMovement.architecture.guards.test.ts`

| Area | Coverage |
|------|----------|
| ACCESS | authorized cashier; missing `POS_ACCESS`; missing `REGISTER_ADJUST`; unauthenticated router; owner/admin/`PLATFORM_OWNER` without grants |
| TENANT | same restaurant success; forged restaurant id; cross-restaurant Register; foreign Terminal |
| CASHIER | authenticated `actorUserId`; forged `cashierId` / `operatorUserId` ignored |
| REGISTER | active Register; closed Register → `shift_required`; wrong Register (no shift); cross-restaurant Register |
| SHIFT | active Shift; closed Shift → `shift_required`; wrong Shift hint → `shift_mismatch` |
| TERMINAL | valid POS Terminal; forged id; wrong-restaurant Terminal |
| IDEMPOTENCY | first request; exact retry; conflicting retry; concurrent duplicate |
| BOUNDARY | CRMP façade invoked; no POS cash table; no Settlement/Check/Order/Reporting write (guards) |

Regression: POS folder, CRMP Register/Shift/Drawer Movement, Settlement, Check, Order, Reporting.
