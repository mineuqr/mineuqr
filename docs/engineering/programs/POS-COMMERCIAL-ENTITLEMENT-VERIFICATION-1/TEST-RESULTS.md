# TEST RESULTS

**Code change:** none. **New tests:** 0.

## Combined regression command

```
pnpm exec vitest run server/pos server/subscription-runtime server/subscriptionPlanLimits.test.ts server/commercial/__tests__/planCapabilityGating.guards.test.ts server/commercial-catalog/__tests__/commercialLivePlans.limits.repair.test.ts server/commercial-catalog/__tests__/commercialCapabilityOperationalValidation.test.ts shared/pos server/order/application/__tests__/IdentityPlaceOrderService.test.ts server/order/application/__tests__/SettleOrderPaidService.test.ts server/order/application/__tests__/StaffCounterPickupSettlementService.test.ts server/crmp server/operational-session/check/__tests__/CheckService.orderSettlementIntegration.test.ts server/operational-session/check/__tests__/checkSettlementRecordIntegration.test.ts server/operational-session/check/__tests__/checkOrderSettlementIntegration.test.ts server/reporting-platform/__tests__/financialReportingParity.test.ts
```

**53 files passed / 0 failed**  
**359 tests passed / 0 failed**

## Targeted (existing commercial POS proofs; 0 new)

| File | Tests |
|------|-------|
| `posEntitlement.test.ts` | 5 |
| `posCommercial.integration.test.ts` | 3 |
| `posTerminalAccess.test.ts` (includes `entitlement_unavailable`) | 11 |
| `pos.architecture.guards.test.ts` | 6 |
| `posTerminalAccess.architecture.guards.test.ts` | 6 |
| `posTerminal.domain.test.ts` | 5 |

**Targeted existing proofs: 36 passed.**

## POS folder

**171 passed / 0 failed** (unchanged vs POS-SALE-TRANSACTIONAL-SAFETY-HARDENING-1).

## Commercial / subscription runtime

Includes `checkLimit` / `requireFeature` matrix, lifecycle, account state, Live Plan limits repair, capability operational validation, `subscriptionPlanLimits`.

## Core domains

IdentityPlaceOrder, SettleOrderPaid, StaffCounterPickup, Check settlement integration, CRMP Register/Shift/drawer/router, reporting parity — all passed in the combined run.

## Build / check

- `pnpm build` — **PASS**
- `pnpm check` — **188** preexisting `error TS*` — unchanged vs POS-SALE-TRANSACTIONAL-SAFETY-HARDENING-1 baseline
