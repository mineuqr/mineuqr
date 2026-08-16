# CRMP CASH OPERATIONS AUDIT

| Operation | Owner | Public API | Idempotency | POS action |
|-----------|-------|------------|-------------|------------|
| Register duty open/close | CRMP | `crmp.register.*` | Replay if already in target state | POS adapter |
| Financial Shift open | CRMP | `crmp.financialShift.open` | By `financialShiftId` | POS adapter (deterministic id from POS idempotency key) |
| Financial Shift close | CRMP | `crmp.financialShift.close` (final count corridor) | Close replay if already closed; final count is once | POS adapter |
| `opening_float` | CRMP (on shift open) | Via shift open | Tied to shift id | Consumed |
| `paid_in` / `paid_out` / `safe_drop` / `manual_adjustment` | CRMP domain | **None** | **None** (append-only) | **GAP — not wired** |
| Interim count | CRMP domain | None | — | GAP |
| Handover | CRMP domain | None | — | GAP |
| Daily expenses | — | None | — | GAP (`paid_out` would be the model if/when CRMP exposes it) |

`REGISTER_ADJUST` remains catalog-only until CRMP publishes an idempotent drawer-movement API.
