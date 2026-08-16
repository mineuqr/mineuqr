# TERMINAL ACCESS LIFECYCLE

| Lifecycle | Operational access |
|-----------|--------------------|
| `active` | Allowed if other checks pass |
| `registered` | Denied (`terminal_inactive`) |
| `deactivated` | Denied |
| `replaced` | Denied |
| unknown | Denied (`terminal_not_found`) |
| other restaurant | Denied (`terminal_foreign`) |

Historical identity remains on the Phase 1 terminal row. Access does not rewrite or delete it.
