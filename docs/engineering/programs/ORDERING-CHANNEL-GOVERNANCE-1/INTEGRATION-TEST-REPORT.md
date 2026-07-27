# ORDERING-CHANNEL-GOVERNANCE-1 — Integration Test Report

| Suite | Coverage |
|-------|----------|
| `orderingChannelGovernance.architecture.guards.test.ts` | Registry, no TABLE fallback, place stamps |
| `orderingChannelGovernance.integration.test.ts` | Table Session / QR / Waiter / Kiosk → analytics buckets + mix % |
| `SalesChannelAnalyticsService.test.ts` | Unassigned for null stamp; no identityScope inference |
| `IdentityPlaceOrderService.test.ts` | Required `orderingChannel` on identity place |

## Commands

```bash
npx vitest run shared/ordering-platform/__tests__/orderingChannelGovernance.architecture.guards.test.ts
npx vitest run server/reporting-platform/__tests__/orderingChannelGovernance.integration.test.ts
npx vitest run server/reporting-platform/__tests__/SalesChannelAnalyticsService.test.ts
npx vitest run server/order/application/__tests__/IdentityPlaceOrderService.test.ts
```

## Verified

- Correct channel mapping per stamp
- Totals + percentages
- No double counting
- No identityScope fallback execution
