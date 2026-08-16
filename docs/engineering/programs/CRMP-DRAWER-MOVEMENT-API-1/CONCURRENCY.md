# CONCURRENCY

Financial Shift remains the OCC aggregate (`version`).

Drawer movements are children of that aggregate. There is no separate stored running balance. Expected cash is computed from the shift graph after a successful save.

Unsafe pattern **not used**: read balance → calculate → write balance.

Concurrent distinct movements: first save wins; second hits version conflict; public service retries **once** after reload so independent movements serialize instead of failing the operator.

Concurrent identical idempotency keys: first appends; second either OCC-retries into alreadyApplied or sees the existing id before save.

Suspended/closing shifts are not mutable (`shiftIsMutable` is `status === "open"` only).
