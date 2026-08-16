# CONCURRENCY AUDIT

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Target: mineuqr-stagIn / mineuqr / G07_DATABASE_URL. Identity ACCEPT_NON_PRODUCTION; `sameSqlUserAsProductionMain=false`. Engine 8.0.11-TiDB-v8.5.3-serverless. Independent pools; G-07/G-08 P14/P16 use separate OS processes.

| # | Case | Evidence | Result |
|---|------|----------|--------|
| 1 | same-tenant last-slot | G-07 P4 | occupancy 2, fulfilled 1 |
| 2 | same-tenant at-cap | G-07 P5 / G-08 P3 | occupancy stays at cap |
| 3 | 8-way create | G-07 P12 | fulfilled 1, rejected 7, occupancy 1 |
| 4 | owner ∥ admin | G-09 | occupancy 2 |
| 5 | admin ∥ admin | G-09 | occupancy 2 |
| 6 | cross-tenant | G-07 P6 (re-run 6291ms / full suite 5564ms) | A=2 B=2 |
| 7 | create ∥ delete | G-08 P4 | occupancy ≤ cap = COUNT |
| 8 | create ∥ deactivate | G-10 | occupancy 1, create rejected |
| 9 | reactivation ∥ create | G-10 / G-11 | catalog reactivate not a slot; POS at cap rejected |
| 10 | POS provision race | G-07 P8 | occupancy 2 |
| 11 | POS replace race | G-07 P9 | occupancy 1 |
| 12 | POS provision ∥ delete | TOCTOU | orphans 0 |
| 13 | restaurant delete ∥ child | G-08 P12 / TOCTOU | orphans 0 |
| 14 | rollback | G-07 P10 / G-09 / G-11 | occupancy 0 after throw |
| 15 | lock contention | G-07 P11 | loser sees committed COUNT |
| 16–17 | deadlock / lock-wait retry | helper 3 retries on 1213/1205 | exercised via contention |
| 18 | independent pools | all TiDB `db`+`dbB` | PASS |
| 19 | independent processes | G-07 P14, G-08 P16 | occupancy ≤ cap |
| 20 | downgrade ∥ create | G-11 | never exceeds old cap |

First G-07 P6 run hit default vitest 5000ms (work finished at ~5023ms). Harness aligned to 30s (same as G-08/G-11). Full G-07 then 12/12. Not an occupancy defect.
