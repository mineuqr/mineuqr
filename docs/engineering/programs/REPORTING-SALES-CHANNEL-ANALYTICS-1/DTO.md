# REPORTING-SALES-CHANNEL-ANALYTICS-1 — DTO Specification

## Contract

```ts
contractId: "SalesChannelAnalytics"
programId: "REPORTING-SALES-CHANNEL-ANALYTICS-1"
```

Defined in `shared/reporting-platform/reportingContracts.ts`.

## SalesChannelAnalyticsDto

| Field | Type | Notes |
|-------|------|-------|
| contractVersion | string | Shared reporting contract version |
| contractId | `"SalesChannelAnalytics"` | Fixed |
| programId | `"REPORTING-SALES-CHANNEL-ANALYTICS-1"` | Fixed |
| generatedAt | ISO string | Generation timestamp |
| restaurantId | number | Tenant |
| from / to | string \| null | Period bounds |
| totalSalesAmount | string | Sum of bucket sales (Order Sales plane) |
| totalOrderCount | number | Sum of bucket order counts |
| buckets | readonly bucket[] | Catalog + active future channels |

## SalesChannelAnalyticsBucketDto

| Field | Type | Notes |
|-------|------|-------|
| channelId | string | Reporting sales channel id |
| channelName | string | Localized label at build time (EN default in API) |
| orderCount | number | Served orders |
| salesAmount | string | Decimal string |
| salesMixPercent | string | Share of totalSalesAmount |
| orderMixPercent | string | Share of totalOrderCount |

## Presentation rule

Dashboard / Excel / PDF MUST consume this DTO (or mapped display facts from it).

Forbidden:

- UI recalculation of mix %
- Temporary mock channel amounts
- Inferring channels from payment / session in the UI
