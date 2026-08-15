# IDEMPOTENCY

No second idempotency system.

- Repeat create on an already entitled owner → existing `CONFLICT` (“use update”).
- Persist retry for the **same** `subscriptionId` with matching plan/amount/currency/cycle → success, no second insert.
- Duplicate-key race: re-read; match → success; mismatch → fail closed.
- Different terms on an existing Binding → fail closed (no overwrite).
