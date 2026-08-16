# TIDB RACE RESULTS

**Program:** COMMERCIAL-INACTIVE-OCCUPANCY-POLICY-1  
**Date:** 2026-08-17  

Identity: ACCEPT_NON_PRODUCTION · 3BUSFE99csVhDLu · 8.0.11-TiDB-v8.5.3-serverless.

## G10_EVIDENCE (9/9)

| Case | Result |
|------|--------|
| inactive category | occupancy 1, create rejected |
| reactivate category | occupancy 1 |
| create ∥ deactivate | occupancy 1, create **rejected** |
| unavailable item | occupancy 1 |
| inactive restaurant | occupancy 1 |
| POS deactivate then provision | provisioned 1 |
| POS at-cap extra provision | rejected, provisioned 1 |
| cross-tenant | a=1 b=1 |

Matches selected policy. `occupancy <= cap` held.
