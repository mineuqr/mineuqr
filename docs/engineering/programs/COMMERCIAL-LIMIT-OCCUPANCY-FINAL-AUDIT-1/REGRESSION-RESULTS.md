# REGRESSION RESULTS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-FINAL-AUDIT-1  

Independent re-runs. Not copied from predecessor reports.

## TiDB (serial, G07 only)

| Suite | Files | Tests | Result |
|-------|-------|-------|--------|
| G-07 | 1 | 12 | PASS (P6 re-proven after timeout align) |
| G-08 | 1 | 18 | PASS |
| Cascade TOCTOU | 1 | 12 | PASS |
| G-09 | 1 | 10 | PASS |
| G-10 | 1 | 9 | PASS |
| G-11 | 1 | 15 | PASS |
| **TiDB total** | **6** | **76** | **PASS** |

## Targeted non-TiDB

| Batch | Files | Tests | Result |
|-------|-------|-------|--------|
| Occupancy/POS/onboarding/guards | 18 | 109 | PASS |
| Entitlement/cascade/POS domain/onboarding HTTP | 8 | 51 | PASS after hub mock complete |

## Build / check

| | |
|--|--|
| BUILD | PASS (`pnpm build`) |
| CHECK | 188 `error TS*` |

## TEST FILE COUNT / TEST COUNT

Documented above by batch. No failed occupancy invariant. One G-07 timeout flake (harness). One PLATFORM_OWNER hub mock miss (test-only, fixed).
