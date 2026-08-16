# IDEMPOTENCY

Investigation (ADR-ARCH-021, existing Check settle):

- Check finalize uses `UPDATE … WHERE outcome='open'` CAS.
- Second settle of an already-paid Check throws `CheckTransitionError`.
- Settlement Record unique business key can yield `already_applied`.
- Existing Check / Settlement Record idempotency is sufficient for **financial** mutation.

POS still needs a **command** retry envelope (same pattern as Check Intake): restaurant + terminal + user + `idempotencyKey`, SHA-256 fingerprint of restaurant/terminal/user/order.

- Same key + same fingerprint → replay the canonical prior result. Check settle is not called again.
- Same key + different Order → `idempotency_conflict`.
- Concurrent same key → in-memory `runExclusive` → one settle.

No second POS settlement SQL table. No `0094`. In-memory store only, matching Check Intake local certification.

A Production persistence table is **not** required for this local program. Existing Check CAS plus command-level in-memory exclusive replay prevent duplicate financial mutation under the tested retry/concurrency cases.
