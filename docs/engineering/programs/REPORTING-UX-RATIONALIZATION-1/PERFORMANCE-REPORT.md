# Performance Report

## Live probe (`720007`, July 2026)

| Operation | Duration |
|-----------|----------|
| Parallel reporting APIs (`summary` + `trend` + `payment` + `orderSalesRollup`) | **1550 ms** |
| Excel workbook generation (6 sheets) | **79 ms** |

## Automated reconciliation suite

| Suite | Wall time (approx) |
|-------|--------------------|
| Final UAT reconciliation (4 tests) | ~0.4 s tests / ~12 s collect+run with peers |
| Acceptance Excel sample write | ~0.3 s test body |

## Assessment

No evidence of regression vs prior reporting export performance envelope. Excel generation remains sub-100 ms for this restaurant/period. API latency dominated by TiDB round-trips (expected for remote Production DB from local probe).

**Status:** No performance blocker for certification.
