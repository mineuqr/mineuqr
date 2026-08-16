# PRODUCTION READINESS

**Program:** COMMERCIAL-DOMAIN-CASCADE-TOCTOU-HARDENING-1  

| Layer | State |
|-------|--------|
| Local application | Parent-row lock on delete + A-class creates |
| Occupancy helper | Unchanged (G-07 certified) |
| 0094 | Unchanged; not modified |
| Schema | No FK, no 0095 |
| Production database | **Not touched** |
| Production application deploy | **Not done** (G-02 still the occupancy deploy gate) |
| This program Production mutation | **0** |

## What must be true before Production application deployment of *this* change

The occupancy helper (G-02) and this parent-lock change should ship together or with occupancy already live. Shipping parent lock without occupancy still closes the delete∥create orphan on admin/order/delete paths; owner quantity creates still need the occupancy txn to hold the parent lock (the lock lives inside `countOccupancy` when `tx` is present).

Do **not** treat this program as Production certification. Do **not** apply any new migration to Production.

## Git

Deferred. No commit, no push.

## STOP

Do not start G-09, G-10, G-11, Final Commercial Occupancy Audit, Commercial Production Certification, or POS-READ-APIS-IMPLEMENTATION-1 until this program is reviewed.
