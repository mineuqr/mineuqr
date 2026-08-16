# IMPLEMENTATION

`PosCashierCrmpOperationsService`:

1. `assertRestaurantPosScope`
2. `resolvePosTerminalAccess` with `SHIFT_OPEN` or `SHIFT_CLOSE`
3. Require `POS_ACCESS` plus that permission
4. Load CRMP register in restaurant scope
5. Reject terminal/register device mismatch when both sides are bound
6. Call existing CRMP façade with `operatorUserId` / `actorUserId` = `context.userId`

Shift open derives `financialShiftId` from the POS idempotency key so CRMP's existing id-based retry works.

Cash movements, handover, and interim count are not implemented.
