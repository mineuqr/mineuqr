# OWNERSHIP MATRIX

| Concern | Owner |
|---|---|
| Authenticated user identity | Existing Auth (`users.id`) |
| Restaurant access | Existing `assertRestaurantAccess` / `assertRestaurantPosScope` |
| POS access | POS |
| POS permissions | POS `pos_permission_grants` |
| POS Terminal | POS |
| POS channel | Ordering Platform / POS (`cashier_pos`) |
| Order | Order Domain |
| Check | Check Domain |
| Settlement | Financial Settlement / Check |
| Register | CRMP |
| Financial Shift | CRMP |
| Cash operations | CRMP (drawer on Financial Shift) |
| Cashier identity | Authenticated user + POS grants |
| Cashier attribution | POS wires `context.userId` into CRMP operator/actor slots |
| Reporting | Existing Reporting Platform |
| Tax | Business Tax Policy / Check |
| ZATCA | Future compliance boundary |
