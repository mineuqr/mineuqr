# TEST RESULTS

## Targeted POS Settlement Initiation

`pnpm exec vitest run server/pos/__tests__/posSettlementInitiate.order.test.ts server/pos/__tests__/posSettlementInitiate.architecture.guards.test.ts`

**21 passed / 0 failed**

- `posSettlementInitiate.order.test.ts` — 15
- `posSettlementInitiate.architecture.guards.test.ts` — 6

## POS folder

`pnpm exec vitest run server/pos/__tests__`

**100 passed / 0 failed** (includes the 21 targeted tests)

## Check / Order / Settlement / Register / channel

`CheckService.m4`, `CheckService.m5`, `checkMembershipService`, `CheckService.settlementRecordConcurrency`, `CheckService.orderSettlementIntegration`, `SettleOrderPaidService`, `IdentityPlaceOrderService`, `RegisterDomainService`, `orderingChannelGovernance.architecture.guards`, `posDomain.foundation`

**47 passed / 0 failed**

Regression excluding this program's 21 targeted tests: **126 passed / 0 failed**.

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's POS settlement files. Count unchanged from POS-CHECK-INTAKE-IMPLEMENTATION-1.
