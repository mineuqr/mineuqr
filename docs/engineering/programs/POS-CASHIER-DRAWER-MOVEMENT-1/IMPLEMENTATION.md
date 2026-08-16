# IMPLEMENTATION

Smallest change: extend the existing POS cashier CRMP adapter.

1. `PosCashierCrmpOperationsService.recordDrawerMovement`
   - `assertRestaurantPosScope`
   - `resolvePosTerminalAccess` with `REGISTER_ADJUST`
   - require `POS_ACCESS` + `REGISTER_ADJUST`
   - `assertRegisterForTerminal`
   - call `this.shifts.recordDrawerMovement` with `actorUserId: context.userId`
   - forward `idempotencyKey`; do not derive `movementId`
2. `pos.cashier.financialShift.recordDrawerMovement` router procedure
3. Map CRMP not-found / conflict / validation / immutability / invariant onto existing POS error codes
4. Update CRMP POS-boundary guards so POS may consume the certified façade without owning persistence

No new service class. No new store. No new permission. No migration.
