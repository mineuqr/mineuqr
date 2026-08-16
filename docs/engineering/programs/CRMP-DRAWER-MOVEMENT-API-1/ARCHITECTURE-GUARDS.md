# ARCHITECTURE GUARDS

Guards must prove:

1. Drawer movement API lives under `crmp.financialShift`.
2. POS services/router still do not call `recordMovement` / `paid_in`.
3. No `pos_cash_*` schema.
4. Router uses `assertRestaurantAccess` and stamps actor from `ctx.user.id`.
5. Input schema has no `actorUserId` / `operatorUserId`.
6. Journal has no `0094_`.
7. Domain command does not import Check/Settlement/Reporting.
8. Opening float is not a public movement type.
9. No UPDATE/DELETE movement API.
