# TEST PLAN

## Targeted

- Successful atomic sale (Order committed iff mapping committed)
- Idempotent retry same key + fingerprint
- Same key + different fingerprint fail-closed
- Concurrent same-key (unsynchronized store = cross-instance)
- Concurrent different keys independent
- Order persistence failure â†’ no mapping
- Mapping persistence failure â†’ Order not committed (companion rollback)
- Unique collision + fingerprint mismatch
- Cashier / terminal / channel from server context
- Architecture: hook inside Order `db.transaction`; no legacy fallback; no POS Order
- IdentityPlaceOrder forwards hook and still enrolls Check after commit
- Drizzle `putInTransaction` maps `ER_DUP_ENTRY` to unique collision (not same-fingerprint success)

## Regression

Existing POS folder, Order settle / staff counter / IdentityPlaceOrder, Check settlement, CRMP Register/Shift/drawer, reporting parity.

Real MySQL is not required to prove the companion-write contract: the hook runs inside the same `db.transaction` callback; a thrown hook error aborts that callback (Drizzle/mysql2 rollback). Unique collision is mapped before BI retry/legacy can insert a second Order.
