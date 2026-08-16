# INVARIANTS

1. Success â†’ canonical Order and POS mapping both exist (same commit).
2. Failure of mapping insert â†’ Order/items/BI/outbox roll back; no POS mapping row.
3. Retry same key + fingerprint â†’ original mapping result.
4. Same key + different fingerprint â†’ fail closed; original row not overwritten.
5. Concurrent same key â†’ one committed Order; loser rolls back and replays or fail-closes.
6. Different keys â†’ independent Orders.
7. Cross-restaurant â†’ existing POS access fail-closed.
8. Terminal ownership â†’ existing POS access.
9. Channel, cashier, totals â†’ server-derived.
10. Two instances racing the same key cannot both commit a canonical Order mapped to that key.
