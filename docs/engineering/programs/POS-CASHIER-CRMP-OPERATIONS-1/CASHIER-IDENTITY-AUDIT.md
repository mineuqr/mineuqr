# CASHIER IDENTITY AUDIT

There is **no cashier entity**.

| Plane | Field | Meaning |
|-------|-------|---------|
| Auth | `users.id` | Canonical person |
| POS | `PosAccessContext.userId` / `cashierUserId` | Cashier for POS commands |
| Register duty | `assignedOperatorUserId` | Operator assigned while duty is open |
| Financial Shift | `operatorUserId` | Custody operator |
| Attribution | `crmp_settlement_attributions.operatorUserId` | Post-settle association |

`users.role` is only `user | admin`. Not a cashier role.

Canonical cashier for this program: **authenticated user with explicit POS grants**. Owner/admin/PLATFORM_OWNER are not cashiers without grants.

POS adapters stamp CRMP `operatorUserId` / `actorUserId` from that identity. Client `cashierId` / `operatorUserId` are ignored.
