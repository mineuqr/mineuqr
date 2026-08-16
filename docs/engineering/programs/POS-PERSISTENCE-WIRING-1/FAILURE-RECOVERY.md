# FAILURE RECOVERY

| Scenario | Current behavior | Safe? | This program |
|----------|------------------|-------|--------------|
| Database unavailable | `database_unavailable`; no InMemory fallback in production | Yes â€” fail closed | Fixed |
| Database timeout | Propagates as infrastructure error / 500 | Yes â€” no silent success | Existing `getDb` / mysql2 |
| Duplicate idempotency key, same fingerprint | Treat as success; return stored record; no overwrite | Yes | Implemented |
| Same key, different fingerprint | `idempotency_conflict`; original row kept | Yes â€” fail closed | Implemented |
| Order create succeeds, idempotency persist fails | Order exists without map; retry with same key+fingerprint creates another Order then `put` (or unique race) | GAP â€” orphan Order possible | Documented; not wrapped in POS TX |
| Idempotency persist succeeds, response lost | Retry: `get` hits row, same fingerprint â†’ replay | Yes | Existing sale flow |
| Browser retry | Same as above when key+fingerprint match | Yes | Existing |
| Terminal lifecycle changes during request | Access resolved at start; later deactivate does not roll back a completed Order | Acceptable for this phase | Deferred to later ops policy |
| Permission revoked during request | Access resolved at start | Acceptable for this phase | Deferred |

Sensitive logging: sale `opsLog` records orderId and terminalId, not the raw idempotency key. Duplicate-key handling does not log credentials.

Deferred: orphan Order reconciliation, SQL Check/Settlement POS idempotency, commercial freeze, POS UI.
