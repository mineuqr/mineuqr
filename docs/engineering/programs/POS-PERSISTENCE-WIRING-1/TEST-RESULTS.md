# TEST RESULTS

## Targeted persistence wiring

`pnpm exec vitest run server/pos/__tests__/posPersistence.wiring.test.ts server/pos/__tests__/drizzlePosStores.test.ts server/pos/__tests__/posPersistence.architecture.guards.test.ts`

**27 passed / 0 failed**

- `posPersistence.wiring.test.ts` â€” 12
- `drizzlePosStores.test.ts` â€” 11
- `posPersistence.architecture.guards.test.ts` â€” 4

## POS folder

`pnpm exec vitest run server/pos`

**160 passed / 0 failed** (predecessor baseline 133; +27 this program)

Includes: terminal domain/access, entitlement, sale, Check intake, settlement, register/shift, drawer movement, cashier CRMP, architecture guards.

## CRMP / Order / Check / Reporting regression

Same set as POS-CASHIER-DRAWER-MOVEMENT-1 plus POS folder in one run:

RegisterDomainService, FinancialShiftDomainService, SettlementContextResolver, crmp architecture/drawer guards, crmpRouter, crmpDrawerMovement.api, financialShiftCommands, StaffCounterPickupSettlementService, SettleOrderPaidService, CheckService.orderSettlementIntegration, checkSettlementRecordIntegration, reportingSettlementRecordAdoption, financialReportingParity, posDomain.foundation

**270 passed / 0 failed** for the combined command (includes the 160 POS tests).

Regression excluding this programâ€™s 27 targeted tests: **243 passed / 0 failed**.

## Build / check

- `pnpm build` â€” PASS
- `pnpm check` â€” exit 2/1 â€” **188** preexisting `error TS*`, unchanged from POS-CASHIER-DRAWER-MOVEMENT-1. Zero diagnostics under `server/pos/` for this program.
