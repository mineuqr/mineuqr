# TIDB CONCURRENCY RESULTS

**Program:** COMMERCIAL-ADMIN-LIMIT-ENFORCEMENT-1  
**File:** `commercialAdminLimitEnforcement.tidb.test.ts`  
**Date:** 2026-08-17  

## Identity

`ACCEPT_NON_PRODUCTION` · G07_DATABASE_URL · userPrefix `3BUSFE99csVhDLu` · `sameSqlUserAsProductionMain: false` · 8.0.11-TiDB-v8.5.3-serverless · pessimistic · session RR · occupancy txn RC.

## G09_EVIDENCE (10/10 passed)

| Case | Result |
|------|--------|
| cap-1 | occupancy 2 / cap 2 |
| at cap | rejected; occupancy 1 / cap 1 |
| owner ∥ admin | occupancy **2**, fulfilled **1**, exceeded **1** |
| admin ∥ admin | occupancy **2** |
| admin ∥ delete | restaurant 0, categories 0 |
| cross-tenant | elapsedMs 1524; A=1 B=1 |
| item owner ∥ admin | occupancy 2 |
| failure injection | occupancy 0 |
| G-06 mapping | FORBIDDEN / INTERNAL_SERVER_ERROR |

**No caller role obtained an extra slot.**
