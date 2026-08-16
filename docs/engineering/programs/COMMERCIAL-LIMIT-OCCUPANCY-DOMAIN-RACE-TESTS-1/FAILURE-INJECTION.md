# FAILURE INJECTION

Injected inside the occupancy transaction after domain INSERT, then throw.

| Injection | Rollback occupancy | Cap |
|-----------|--------------------|-----|
| Restaurant insert then throw | COUNT=0 | 2 |
| POS related insert then throw (`delta=0` path) | provisioned COUNT=0 | 1 |

Lock acquisition + capacity decision without insert leaves COUNT unchanged (create never called / throw before insert).

No phantom occupancy: the lock table is not a counter. Failed txns do not increment domain COUNT.

## Verdict

**A. PASS.**
