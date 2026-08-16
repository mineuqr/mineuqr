# TEST RESULTS

## Targeted POS cashier CRMP adapters

`pnpm exec vitest run server/pos/__tests__/posCashierCrmp.operations.test.ts server/pos/__tests__/posCashierCrmp.architecture.guards.test.ts`

**11 passed / 0 failed**

- `posCashierCrmp.operations.test.ts` — 7
- `posCashierCrmp.architecture.guards.test.ts` — 4

Covered: authenticated cashier open/close Register and Shift; `POS_ACCESS` without `SHIFT_OPEN`/`SHIFT_CLOSE` denied; owner/admin/`PLATFORM_OWNER` without grants denied; shift-open retry idempotent; forged `financialShiftId` rejected; closed register cannot host a shift; cross-restaurant register rejected; terminal/register device mismatch rejected; client cashier/operator ids ignored; no POS cashier/cash tables; no drawer-movement API; CRMP `assertRestaurantAccess` unchanged.

## POS folder

`pnpm exec vitest run server/pos/__tests__`

**122 passed / 0 failed** (includes the 11 targeted tests)

## CRMP / Settlement regression

`RegisterDomainService`, `FinancialShiftDomainService`, `SettlementContextResolver`, `crmp.architecture.guards`, `crmpRouter`, `StaffCounterPickupSettlementService`, `SettleOrderPaidService`

**64 passed / 0 failed**

Regression excluding this program's 11 targeted tests: **175 passed / 0 failed** (POS remainder 111 + CRMP/settlement 64).

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in `server/pos/` or this program's files. Count unchanged from POS-REGISTER-SHIFT-IMPLEMENTATION-1.
