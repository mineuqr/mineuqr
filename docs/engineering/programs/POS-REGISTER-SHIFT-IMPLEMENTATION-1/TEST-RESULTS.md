# TEST RESULTS

## Targeted POS Register/Shift wiring

`pnpm exec vitest run server/pos/__tests__/posRegisterShift.context.test.ts server/pos/__tests__/posRegisterShift.architecture.guards.test.ts server/pos/__tests__/posSettlementInitiate.order.test.ts server/pos/__tests__/posSettlementInitiate.architecture.guards.test.ts`

**32 passed / 0 failed**

- `posRegisterShift.context.test.ts` — 4
- `posRegisterShift.architecture.guards.test.ts` — 4
- `posSettlementInitiate.order.test.ts` — 18
- `posSettlementInitiate.architecture.guards.test.ts` — 6

## POS folder

`pnpm exec vitest run server/pos/__tests__`

**111 passed / 0 failed** (includes the 32 targeted tests)

## CRMP / Settlement regression

`RegisterDomainService`, `FinancialShiftDomainService`, `SettlementContextResolver`, `crmp.architecture.guards`, `crmpRouter`, `StaffCounterPickupSettlementService`, `SettleOrderPaidService`

**64 passed / 0 failed**

Regression excluding this program's 32 targeted tests: **143 passed / 0 failed**.

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's POS Register/Shift files. Count unchanged from POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1.
