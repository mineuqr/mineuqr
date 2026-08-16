# FAILURE SAFETY AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Occupancy mutations run in one READ COMMITTED transaction after the mutex is held.

| Failure | Result |
|---------|--------|
| After lock, decide deny | No create |
| After decide allow, create throws | Rollback; COUNT unchanged (G-07 P10, G-09, G-11, TOCTOU) |
| After related insert then throw | Rollback (G-08 P15) |
| Before commit | No phantom occupancy |
| Plan write vs create | Separate txns; accepted decide-time cap (not partial domain state) |

No orphan from failed child insert under parent lock.
