# TIDB RACE TEST PLAN

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  

G07_DATABASE_URL · mineuqr-stagIn · independent pools · owners 982001001 / 982001002.

| # | Race | Policy expected |
|---|------|-----------------|
| 1 | Inactive category at cap, create | reject; COUNT=1 |
| 2 | Reactivate category, create at cap | COUNT=1; create reject |
| 3 | CREATE ∥ isActive=0 at cap 1 | COUNT=1; create reject |
| 4 | Unavailable item at cap, create | reject; COUNT=1 |
| 5 | Inactive restaurant at cap, create | reject; COUNT=1 |
| 6 | POS deactivate then provision | provisioned=1 |
| 7 | POS second provision at cap | reject |
| 8 | Cross-tenant inactive B vs create A | A=1 B=1 |

No MySQL-only proof.
