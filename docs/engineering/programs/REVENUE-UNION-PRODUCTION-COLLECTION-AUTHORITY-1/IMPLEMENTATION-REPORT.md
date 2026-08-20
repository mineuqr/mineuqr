# IMPLEMENTATION-REPORT

Program: `REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1`

---

## Engine

| File | Change |
|---|---|
| `revenueUnionContract.ts` | `PRODUCTION_OVERLAP` / `DUPLICATE` classes; overlap result fields |
| `revenueUnionClassifier.ts` | PRODUCTION_OVERLAP only when sale overlap + published production |
| `revenueUnionIdentity.ts` | `provenEconomicSaleOverlap`, `unsafeEconomicIdentityCollision` |
| `revenueUnionResolver.ts` | CF-wins on proven overlap; unsafe/duplicate collisions UNRESOLVED; isolated BOTH preserved |
| `revenueUnionAggregator.ts` | refund skip exception for overlap-excluded Gross |
| `index.ts` | export overlap helpers |

## Live reporting (read-only)

| File | Change |
|---|---|
| `settlementRecordReportingAdapter.ts` | project frozen `orderRefsJson` onto reporting facts |
| `RevenueUnionService.ts` | map `orderRefs` → Union `orderIds` |
| `businessMetricsFromUnion.ts` | retain overlap SR for sample/trend/refunds; append CF-only trend rows |
| `BusinessMetricsService.ts` | production-authority observability; trend uses Union projection |

No Cashier, Confirm, Check, ST, OS, SR, or Collection Fact writer edits.
No drizzle SQL / journal change. Last tag remains
`0097_payment_collection_facts_production_purpose`.

---

## Tests added

- `shared/reporting-platform/revenue-union/__tests__/revenueUnionProductionAuthority.test.ts`
- `server/reporting-platform/__tests__/revenueUnionProductionAuthority.architecture.guards.test.ts`
- `server/reporting-platform/__tests__/businessMetricsFromUnion.productionAuthority.test.ts`
- Business Metrics overlap case in `BusinessMetricsService.settlementRecord.test.ts`

Existing isolated BOTH → publish-neither tests were **kept**.
The published production overlap case now expects CF-wins instead of Gross 0.
That is this program’s intended authority decision, not a weakened assertion.

---

## Production safety

- No INSERT / UPDATE / DELETE against `payment_collection_facts`
- No production Collection Fact creation
- No deployment in this program
- Working tree changes are Union/reporting/tests/docs only
