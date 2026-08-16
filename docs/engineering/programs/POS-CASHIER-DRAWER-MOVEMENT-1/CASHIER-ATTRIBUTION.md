# CASHIER ATTRIBUTION

Operator identity is `PosAccessContext.userId` from the authenticated session.

POS stamps `actorUserId: context.userId` when calling CRMP.

Not accepted as identity:

- `cashierId`
- `operatorUserId`
- `actorUserId`
- `userId`

Client extras are ignored. Impersonation is not possible through this adapter.
