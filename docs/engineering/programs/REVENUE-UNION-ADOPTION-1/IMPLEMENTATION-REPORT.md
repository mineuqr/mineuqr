# REVENUE-UNION-ADOPTION-1 — Implementation Report

**Status: IMPLEMENTED (shadow) — NOT ADOPTED (published)**

HEAD at start: `9049313f` (clean `main` = `origin/main`).

## Files

| Area | Path |
|---|---|
| Contract / resolver / formula | `shared/reporting-platform/revenue-union/` |
| Shadow service | `server/reporting-platform/revenue-union/RevenueUnionService.ts` |
| Read-only CF adapter | `server/reporting-platform/revenue-union/collectionFactReportingAdapter.ts` |
| Tests | `shared/reporting-platform/revenue-union/__tests__/`, `server/reporting-platform/__tests__/revenueUnion*` |

Not modified: `PaymentConfirmService`, Cashier UI, `CheckService`, Settlement Record writer, `BusinessMetricsService` published path, `reportingRouter`, schema/migrations.

## Published vs shadow

| Mode | Collection Fact eligibility | Used by Dashboard |
|---|---|---|
| `none` | Facts ignored | No — caller would have to opt in; Business Metrics still reads SR only |
| `isolated` | Isolated purposes only | No |

`getBusinessMetricsSummary` is unchanged (SR + refund SRs).

## Formula

See README. Complimentary/void never enter Gross. CF refunds are not represented (gap).
