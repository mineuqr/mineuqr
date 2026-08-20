# REVENUE-UNION-PUBLISHED-ADOPTION-1 — Implementation Report

**Status: IMPLEMENTED (published pipeline) — Collection Fact contribution NOT ADOPTED**

Baseline HEAD: `49c6e2ad` `feat(reporting): add shadow revenue union without published cutover`.

## Files

| Area | Path |
|---|---|
| Published eligibility + classifier types | `shared/reporting-platform/revenue-union/revenueUnionContract.ts` |
| Classifier | `shared/reporting-platform/revenue-union/revenueUnionClassifier.ts` |
| Fact validation | `shared/reporting-platform/revenue-union/revenueUnionFactValidation.ts` |
| Resolver | `shared/reporting-platform/revenue-union/revenueUnionResolver.ts` |
| Publication mode | `server/reporting-platform/revenueUnionPublication.ts` |
| DTO map | `server/reporting-platform/revenue-union/businessMetricsFromUnion.ts` |
| Published consumers | `server/reporting-platform/BusinessMetricsService.ts` |
| Read-only CF adapter | `server/reporting-platform/revenue-union/collectionFactReportingAdapter.ts` |
| Tests | `shared/reporting-platform/revenue-union/__tests__/revenueUnion.test.ts`, `server/reporting-platform/__tests__/revenueUnionPublished*`, `BusinessMetricsService.settlementRecord.test.ts` |

Not modified: `PaymentConfirmService`, Cashier UI, `CheckService` writers, Settlement Record / ST / OS writers, `posRouter`, `sale.create`, schema, migrations, KPI dictionary formulas.

## Publication switch

| `REPORTING_REVENUE_UNION` | Behavior |
|---|---|
| `published` (default) | Union + eligibility `published` |
| `legacy` | Previous SR aggregator only (rollback) |
| other | Fail closed to `published` |

`REPORTING_FINANCIAL_SOURCE` still selects Check vs Settlement Record as the **legacy** fact source. Union does not replace that emergency switch.

## Published vs isolated

| Eligibility | Collection Fact contribution | Used by Dashboard |
|---|---|---|
| `published` | Allowlist empty → 0 | **Yes** (`getBusinessMetricsSummary` / `Trend`) |
| `none` | Facts ignored | Dual-run / tests |
| `isolated` | Isolated purposes may contribute | Shadow / tests only |

## Observability

`reporting_revenue_union_publication` (SYSTEM) logs **counts and mismatch field names only** when there is a signal: BOTH, UNRESOLVED, duplicates, eligibility rejection, published CF contribution count, dual-run mismatch fields. No amounts, PAN, paymentIntentId, or Check ids.

## Performance

One extra tenant-scoped `SELECT` on `payment_collection_facts` (production row count 0) plus an in-process dual-run aggregator for summary. No second published query API. Not optimized by skipping authority resolution.

## Non-goals (enforced)

No `commitCollectionFact` from Cashier/Confirm. No production CF writes. No historical backfill. No `payments` restaurant table. No Settlement-as-authority. No Check deletion.
