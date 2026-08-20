# DOWNSTREAM-IDEMPOTENCY

ONE payment → ONE Collection Fact → ONE obligation (`collectionFactId`).

| Component | Duplicate prevention |
|---|---|
| Collection Fact | Unique paymentIntentId / idempotency. Recovery never inserts. |
| Check PAID | 0-row UPDATE / CheckTransitionError |
| ST | Skip insert when lines already exist |
| OS | `already_in_state` / CAS on status |
| SR | SR-INV-05 business-key `already_applied` |

Retries use the same `paymentIntentId` ≠ `idempotencyKey` ≠ `collectionFactId`.
