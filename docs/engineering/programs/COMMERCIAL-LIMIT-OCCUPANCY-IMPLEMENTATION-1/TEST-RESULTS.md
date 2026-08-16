# TEST RESULTS

**Date:** 2026-08-16  
**Production mutation:** 0  

## Occupancy unit + guards

| File | Result |
|------|--------|
| `commercialLimitOccupancy.test.ts` | 4 passed |
| `commercialLimitOccupancy.guards.test.ts` | 4 passed |
| `posTerminal.domain.test.ts` | 5 passed |

## Real database concurrency

```
pnpm exec vitest run server/subscription-runtime/__tests__/commercialLimitOccupancy.concurrency.test.ts
```

**10 passed / 0 failed** on isolated Docker MySQL 8.0 (`127.0.0.1:3307`).  
**Not** Production TiDB.

First attempt while Docker Desktop was stopped: suite failed with `CONCURRENCY NOT VERIFIED — Docker MySQL required`. Daemon started; re-run **PASS**.

## Combined predecessor suite (includes occupancy + concurrency)

```
pnpm exec vitest run server/pos server/subscription-runtime server/subscriptionPlanLimits.test.ts server/commercial/__tests__/planCapabilityGating.guards.test.ts server/commercial-catalog/__tests__/commercialLivePlans.limits.repair.test.ts server/commercial-catalog/__tests__/commercialCapabilityOperationalValidation.test.ts shared/pos server/order/application/__tests__/IdentityPlaceOrderService.test.ts server/order/application/__tests__/SettleOrderPaidService.test.ts server/order/application/__tests__/StaffCounterPickupSettlementService.test.ts server/crmp server/operational-session/check/__tests__/CheckService.orderSettlementIntegration.test.ts server/operational-session/check/__tests__/checkSettlementRecordIntegration.test.ts server/operational-session/check/__tests__/checkOrderSettlementIntegration.test.ts server/reporting-platform/__tests__/financialReportingParity.test.ts
```

**56 files passed / 0 failed**  
**377 tests passed / 0 failed**

Predecessor baseline: 53 files / 359 tests.  
Delta: +3 files (occupancy unit, guards, concurrency) +18 tests (4+4+10).

## Extra (not in predecessor suite)

`server/routers.test.ts` — **69 passed** (restaurant/category/item create through occupancy unlocked path with mocked entitlements).

## Build / check

- `pnpm build` — **PASS**  
- `pnpm check` — **188** `error TS*` — matches baseline 188
