# AUDITABILITY

Each movement row is the audit fact:

- restaurant, register (via shift), financial shift
- movement type, amount, currency, reason
- actorUserId (authenticated)
- recordedAt
- movementId (idempotency identity)

Shift `version` increments on a new movement.

CRMP does not introduce a second audit bus. Lifecycle domain events remain shift-level. Movement facts live on the aggregate (same as today).

No Reporting write path is added.
