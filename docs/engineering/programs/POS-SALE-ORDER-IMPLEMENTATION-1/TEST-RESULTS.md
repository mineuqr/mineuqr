# TEST RESULTS

## Targeted POS Sale

`pnpm exec vitest run server/pos/__tests__/posSale.order.test.ts server/pos/__tests__/posSale.architecture.guards.test.ts`

**20 passed / 0 failed**

- `posSale.order.test.ts` — 15
- `posSale.architecture.guards.test.ts` — 5

## Full POS folder

`pnpm exec vitest run server/pos/__tests__`

**62 passed / 0 failed** (includes Phase 1/2 suites; none weakened)

## Order / channel regression

**62 passed / 0 failed** across:

- `IdentityPlaceOrderService.test.ts`
- `resolveBusinessIdentityScope.test.ts`
- `OrderDisplayIdentityResolver.test.ts`
- `DisplayReferenceFormatter.test.ts`
- `orderingChannelGovernance.architecture.guards.test.ts`
- `nonTablePlaceOrder.identity.test.ts`
- `kioskOrderingArchitecture.architecture.guards.test.ts`
- `orderDomain.test.ts`
- `SettleOrderPaidService.test.ts`
- `orderBusinessIdentity.architecture.guards.test.ts`
- `waiterOrderingFoundation.architecture.guards.test.ts`
- `orderFulfilmentProjection.test.ts`

`orderBusinessIdentityHardening.architecture.guards.test.ts` has one pre-existing string-guard failure (`VALUES` now includes `identityScope` from the Waiter BI partition). This program did not modify `DrizzleBusinessIdentityAllocator.ts`. The test was not weakened.

## Migration governance

`scripts/__tests__/migrationGovernance.test.ts` — 16 passed / 0 failed (tail `0093`, count 94)

## Build / check

- `pnpm build` — PASS
- `pnpm check` — exit 2 — **188** preexisting `error TS*`. Zero diagnostics in this program's POS sale, idempotency, router, or `0093` files. Count unchanged from POS-TERMINAL-ACCESS-IMPLEMENTATION-1.
