# ATTRIBUTION

Server derives:

- user ← authenticated session
- restaurant ← PosAccessContext (not client authority)
- terminal ← POS Terminal id after access check
- cashier ← `context.userId`
- register ← CRMP get in restaurant scope; optional device match
- shift ← CRMP active shift on that register (close) or CRMP open result (open)

Never trusted as identity: client `cashierId`, `userId`, `operatorUserId`, `actorUserId`, `role`.
