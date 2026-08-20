# REVENUE-UNION-ADOPTION-1 — Validation Report

**Status: VALIDATED (shadow) — NOT ADOPTED**

## Certification gates

| Gate | Result |
|---|---|
| G1 Legacy semantics documented | PASS |
| G2 Collection Fact semantics documented | PASS, with gaps (no production purpose; no CF refund/void/complimentary kinds) |
| G3 Deterministic authority | PASS |
| G4 One authority per transaction | PASS (`BOTH` excludes both) |
| G5 No duplicate contribution | PASS (collapse + BOTH) |
| G6 Historical Check preserved | PASS |
| G7 CF shadow Revenue | PASS (isolated eligibility) |
| G8 Business Day | PASS (frozen CF `businessDay` + existing `formatIsoWeekKeyFromYmd`; legacy unchanged on SR path) |
| G9 Refund | PASS for **legacy SR**; GAP for Collection Fact compensating kinds |
| G10 Complimentary / void | PASS for **legacy**; GAP for CF kinds |
| G11 Split / multi-check | PASS (boundary only) |
| G12 Idempotency | PASS |
| G13 Dashboard/reporting preserved | PASS (`BusinessMetricsService` / router unchanged) |
| G14 Cashier unchanged | PASS |
| G15 Settlement unchanged | PASS |
| G16 No dual-write | PASS (no Cashier writer; resolver rejects BOTH) |
| G17 No production CF adoption | PASS |

## Test matrix

Covered in `revenueUnion.test.ts` / service / architecture guards: legacy paid, Collection Fact, same-sale BOTH, duplicate Check, duplicate fact, complimentary, void, refund (legacy), split tenders, multi-check, frozen business day, eligibility `none` (zero-CF production), historical-only, mixed non-overlap, currency mismatch, published vs isolated.

Timezone / midnight: Union uses **frozen** `businessDay` on facts and does not re-open working hours. Legacy published trends still use `resolveBusinessPeriodKey` in `businessMetricsAggregator` (unchanged).
