# TEST RESULTS

## Targeted POS drawer-movement adapter

`pnpm exec vitest run server/pos/__tests__/posCashierDrawerMovement.operations.test.ts server/pos/__tests__/posCashierDrawerMovement.architecture.guards.test.ts`

**11 passed / 0 failed**

- `posCashierDrawerMovement.operations.test.ts` — 8
- `posCashierDrawerMovement.architecture.guards.test.ts` — 3

## POS folder

`pnpm exec vitest run server/pos/__tests__`

**133 passed / 0 failed** (includes the 11 targeted tests; predecessor baseline was 122)

## CRMP / Settlement regression

`RegisterDomainService`, `FinancialShiftDomainService`, `SettlementContextResolver`, `crmp.architecture.guards`, `crmp.drawerMovement.architecture.guards`, `crmpRouter`, `crmpDrawerMovement.api`, `financialShiftCommands`, `StaffCounterPickupSettlementService`, `SettleOrderPaidService`

**87 passed / 0 failed**

## Order / Check / Reporting

`posDomain.foundation`, POS sale/check/settlement order tests, `CheckService.orderSettlementIntegration`, `checkSettlementRecordIntegration`, `reportingSettlementRecordAdoption`, `financialReportingParity`

**68 passed / 0 failed** (includes 45 already counted in the POS folder)

Regression excluding this program's 11 targeted tests: **209 passed / 0 failed** (POS remainder 122 + CRMP/settlement 87).

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's POS/CRMP files. Count unchanged from CRMP-DRAWER-MOVEMENT-API-1.
