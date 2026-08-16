# PRODUCTION READINESS

| Gate | Status |
|------|--------|
| Production mutation | **0** |
| Local migrate applied | **0** |
| `0091_pos_terminals` applied | **No** — tests use in-memory terminal store |
| `0092_pos_permission_grants` applied | **No** — tests use in-memory grant store |

Intended persist is the journalized SQL. Runtime remains in-memory until a Production Apply program applies `0091` then `0092` and seeds `posTerminals`.

Do not deploy POS access into Production before that apply: existing Live Plans fail-closed at quantity 0.

Check OCC is not required for access and was not implemented.
