# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Integration Test Report

## Scope

Automated coverage is unit + architecture guards (no live DB harness in this program run).
Channel scenarios are exercised through the pure builder with stamped / legacy rows.

| Scenario | Coverage |
|----------|----------|
| Table Session (legacy TABLE scope) | `SalesChannelAnalyticsService.test.ts` |
| Waiter (`waiter_tablet`) | same |
| QR Ordering (`qr`) | same + stamp preference over TABLE scope |
| Self Ordering Kiosk (`kiosk`) | same |
| Percentages | salesMixPercent / orderMixPercent assertions |
| Totals | totalSalesAmount / totalOrderCount + sum checks |
| No double counting | one order → one bucket |
| Future channel pass-through | `drive_thru` bucket |
| DTO → Sales Source cards | `reportingSalesChannelAnalytics1.architecture.guards.test.ts` |
| Place API stamps | architecture source guards |
| Reporting API surface | router / façade guards |

## Commands

```bash
npx vitest run server/reporting-platform/__tests__/SalesChannelAnalyticsService.test.ts
npx vitest run client/src/lib/reporting-exports/__tests__/reportingSalesChannelAnalytics1.architecture.guards.test.ts
npx vitest run client/src/lib/reporting-exports/__tests__/reportingProductHotfix1.architecture.guards.test.ts
```

## Live UAT (manual / Authority)

1. Place QR / Waiter / Kiosk orders → serve → settle as normal ops
2. Open Reports → Financial Analytics → Sales Source Analysis
3. Confirm cards bind real amounts + mix from `getSalesChannelAnalytics`
4. Confirm totals match sum of channel cards (Order Sales plane)
5. Confirm Total Sales KPI unchanged vs prior build
