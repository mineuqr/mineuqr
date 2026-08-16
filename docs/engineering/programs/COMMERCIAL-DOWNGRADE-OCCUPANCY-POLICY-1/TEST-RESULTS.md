# TEST RESULTS

**Program:** COMMERCIAL-DOWNGRADE-OCCUPANCY-POLICY-1  

| Suite | File | Result |
|-------|------|--------|
| G-11 TiDB | `commercialDowngradeOccupancy.tidb.test.ts` | 15 passed |
| G-11 guards | `commercialDowngradeOccupancy.guards.test.ts` | 5 passed |
| Occupancy unit | `commercialLimitOccupancy.test.ts` | 8 passed (incl. 3 new) |
| Occupancy guards | `commercialLimitOccupancy.guards.test.ts` | 6 passed |
| G-10 guards | `commercialInactiveOccupancy.guards.test.ts` | 3 passed |
| G-07 P8 | `commercialLimitOccupancy.tidb.concurrency.test.ts` | PASS |
| G-08 P12 | `commercialLimitOccupancy.tidb.domainRaces.test.ts` | PASS |
| TOCTOU category | `commercialDomainCascadeToctou.tidb.test.ts` | PASS |
| G-09 owner∥admin | `commercialAdminLimitEnforcement.tidb.test.ts` | PASS |
| G-10 inactive category | `commercialInactiveOccupancy.tidb.test.ts` | PASS |
| Build | `pnpm build` | PASS |
| Check | `pnpm check` error TS* | **188** (unchanged) |
