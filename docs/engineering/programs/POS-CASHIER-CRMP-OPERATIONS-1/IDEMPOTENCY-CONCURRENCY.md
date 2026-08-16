# IDEMPOTENCY / CONCURRENCY

| Command | Mechanism |
|---------|-----------|
| Register open/close | Existing CRMP `alreadyApplied` + register `version` |
| Shift open | Existing CRMP idempotency by `financialShiftId`. POS derives a stable id from restaurant + terminal + user + register + idempotencyKey (SHA-256). No new table |
| Shift close | Existing CRMP close corridor; POS resolves the live shift rather than trusting client id |
| Cash movements | **Not exposed** — append-only, not idempotent |

POS does not introduce a second SQL idempotency store.

Optimistic CRMP `expectedVersion` remains available on CRMP APIs; POS uses current-version default from the domain service.
