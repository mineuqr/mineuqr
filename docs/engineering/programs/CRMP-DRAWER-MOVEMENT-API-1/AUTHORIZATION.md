# AUTHORIZATION

Public command: `crmp.financialShift.recordDrawerMovement`

Contract (existing CRMP, not POS):

1. `verifiedProcedure` — authenticated, email-verified user.
2. `assertRestaurantAccess(ctx, restaurantId, "crmp.financialShift.recordDrawerMovement")` — restaurant owner or admin.
3. Server loads Register by `(restaurantId, registerId)`.
4. Server resolves active Financial Shift for that Register. Shift must be `open` (domain).
5. Actor is `ctx.user.id`. Client `actorUserId` / `operatorUserId` / `cashierId` / `userId` are not accepted.

This is owner/admin CRMP operations, matching `crmp.financialShift.open/close`.

POS `REGISTER_ADJUST` is **not** enforced here. A future POS wiring program must add POS grants without weakening this CRMP gate.

Fail closed: missing auth, wrong restaurant, unknown register, no open shift, closed/suspended shift, validation failure.
