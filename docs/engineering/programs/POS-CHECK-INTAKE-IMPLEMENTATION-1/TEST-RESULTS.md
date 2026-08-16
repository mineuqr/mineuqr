# TEST RESULTS

## Targeted POS Check Intake

`pnpm exec vitest run server/pos/__tests__/posCheckIntake.order.test.ts server/pos/__tests__/posCheckIntake.architecture.guards.test.ts`

**17 passed / 0 failed**

- `posCheckIntake.order.test.ts` — 12
- `posCheckIntake.architecture.guards.test.ts` — 5

## POS folder + Check / Order / Settlement

`pnpm exec vitest run server/pos/__tests__` plus IdentityPlaceOrder, Check membership/M4/M5, SettleOrderPaid, channel governance.

**102 passed / 0 failed**

## Register regression

`server/crmp/__tests__/RegisterDomainService.test.ts` — **8 passed / 0 failed**

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's POS Check Intake files. Count unchanged from POS-SALE-ORDER-IMPLEMENTATION-1.
