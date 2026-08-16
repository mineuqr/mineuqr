# REGRESSION RESULTS

**Program:** COMMERCIAL-LIMIT-OCCUPANCY-PRODUCTION-CERTIFICATION-1  

Independent re-runs this program. TiDB suites used `G07_DATABASE_URL` only (`ACCEPT_NON_PRODUCTION`, user prefix `3BUSFE99csVhDLu`). Not Production.

## Required occupancy suites

| Suite | File | Tests | Passed | Failed | Skipped | Result |
|-------|------|-------|--------|--------|---------|--------|
| G-07 | `commercialLimitOccupancy.tidb.concurrency.test.ts` | 12 | 12 | 0 | 0 | **PASS** |
| G-08 | `commercialLimitOccupancy.tidb.domainRaces.test.ts` | 18 | 18 | 0 | 0 | **PASS** |
| Cascade TOCTOU | `commercialDomainCascadeToctou.tidb.test.ts` | 12 | 12 | 0 | 0 | **PASS** |
| G-09 | `commercialAdminLimitEnforcement.tidb.test.ts` | 10 | 10 | 0 | 0 | **PASS** |
| G-10 | `commercialInactiveOccupancy.tidb.test.ts` | 9 | 9 | 0 | 0 | **PASS** |
| G-11 | `commercialDowngradeOccupancy.tidb.test.ts` | 15 | 15 | 0 | 0 | **PASS** |
| **TiDB total** | **6 files** | **76** | **76** | **0** | **0** | **PASS** |

Final Audit occupancy invariants remain certified.

## Targeted non-TiDB (practical broader suite)

| Batch | Files | Tests | Passed | Failed | Skipped | Result |
|-------|-------|-------|--------|--------|---------|--------|
| Occupancy / onboarding / guards / POS entitlement / PLATFORM_OWNER hub | 18 | 94 | 94 | 0 | 0 | **PASS** |
| Extra POS / catalog architecture guards | 4 | 24 | 24 | 0 | 0 | **PASS** |

Batch 2 includes `restaurantRowLock.guards.test.ts`, already counted in batch 1.

## Not run

Local Docker MySQL occupancy (`commercialLimitOccupancy.concurrency.test.ts`) — not required; G-07 covers real TiDB serialization. Full-repo `pnpm test` not run.

## Result

PASS — G-07, G-08, G-09, G-10, G-11, and Final Audit occupancy suites remain green.
