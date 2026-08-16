# PRODUCTION READINESS

| Gate | Status |
|------|--------|
| Production mutation | **0** |
| Local migrate applied | **0** |
| `0091_pos_terminals` applied | **No** — in-memory terminal store |
| `0092_pos_permission_grants` applied | **No** — in-memory grant store |
| `0093_pos_sale_idempotency` applied | **No** — in-memory idempotency store |

Intended persist is the journalized SQL. Runtime remains in-memory until a Production Apply program applies `0091` → `0092` → `0093` and seeds `posTerminals`.

Do not create POS Orders in Production from this program.

Check OCC was not implemented. Settlement / Register / Reporting were not touched.

Revenue SSOT remains Paid Check `grandTotal`.
