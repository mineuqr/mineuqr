# VALIDATION-REPORT

Program: `PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1`

**Certification: PASS — IMPLEMENTED / VALIDATED / ADOPTED / NOT DEPLOYED**

Production Collection Fact writes were **not** executed against live production. Collection Fact remains **NOT LIVE**.

---

## Command (comprehensive relevant regression)

```
npx vitest run
  server/operational-session/payment
  shared/operational-session/payment/collection-fact
  shared/reporting-platform/revenue-union
  server/pos/__tests__/posSettlementInitiate.order.test.ts
  server/pos/__tests__/posSettlementInitiate.architecture.guards.test.ts
  server/pos/__tests__/cashierSettlementHttpAtFinancialCommit.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierDirectFinancialCommit.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierPaymentFlow.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierSettlementUnknownResultRecovery.test.ts
  server/operational-session/check/__tests__/CheckService.m4.sessionOptionality.test.ts
  server/operational-session/check/__tests__/CheckService.billLifecycle.hardening.test.ts
  server/operational-session/check/__tests__/settlementRecordRepository.test.ts
  server/reporting-platform/__tests__/revenueUnion*.test.ts
  server/reporting-platform/__tests__/businessMetricsFromUnion.productionAuthority.test.ts
  server/reporting-platform/__tests__/BusinessMetricsService.settlementRecord.test.ts
  server/reporting-platform/__tests__/refundReportingAdoption.test.ts
  server/reporting-platform/__tests__/RevenueUnionService.test.ts
  shared/operational-session/__tests__/paymentCollection.architecture.guards.test.ts
  shared/operational-session/__tests__/settlementRecordDomain.architecture.guards.test.ts
```

| Result | Count |
|---|---|
| Test files | **36 passed** |
| Tests | **298 passed** |
| Failed | **0** |
| Skipped | **0** |
| Duration | **37.72s** |

---

## Category results (included in the 298)

| Category | Result |
|---|---|
| Production Collection Fact contract | `productionCollectionFactCommitContract.test.ts` **12 passed** |
| Collection Fact writer | `productionCollectionFactCommit.test.ts` **11**; `CollectionFactService.test.ts` **13** |
| Collection Fact execution | `productionCollectionFactCommitExecution.test.ts` **11 passed** |
| Cashier adoption | **14 passed** (new) |
| Cashier adoption architecture | **3 passed** (new) |
| Payment Confirm | **7 passed** (was 4; +3) |
| Payment Confirm architecture | **19 passed** (5+6+5+3) |
| POS settlement | **29 passed** (includes +2 new) |
| POS / Cashier HTTP / flow guards | **21 passed** |
| Check m4 / bill lifecycle / SR repo | **43 passed** |
| Revenue Union + production authority | **37 passed** (`20+17`) |
| Business Metrics / refund / Union service / publication | **21 passed** |
| Collection Fact + payment-collection architecture | **20 passed** |
| Settlement Record domain architecture | **6 passed** |
| Revenue Union architecture guards | **12 passed** |

Additional settlement files run in a prior batch (not double-counted above as unique if overlapping): `CheckService.orderSettlementIntegration.test.ts` **5 passed**; `orderSettlementRepository.test.ts` **6 passed**.

---

## New tests

| Location | Count |
|---|---|
| New files | **17** (14 + 3) |
| Added to `PaymentConfirmService.test.ts` | **3** |
| Added to `posSettlementInitiate.order.test.ts` | **2** |
| **Total new tests** | **22** |

---

## Modified existing tests (architectural reason)

Confirm is the first certified Collection Fact consumer. Guards that asserted Confirm must not mention the writer were updated to:

- require `commitCashierProductionCollectionFact`
- forbid `insertCollectionFact` / `paymentCollectionFacts` on Confirm, Check, POS, panel
- accept the writer first-caller comment

POS/Confirm command expectations now require `paymentIntentId` because Cashier must not manufacture identity from `orderId`.

No Collection Fact, Revenue Union, or Check lifecycle assertion was weakened to hide a financial defect.

---

## Observed out-of-scope pre-existing failure

`shared/operational-session/__tests__/orderSettlementIntegration.architecture.guards.test.ts` still flags `checkRefundIntegration.ts` for `updateOrderSettlement`. That file is unchanged by this program (refund is out of scope). It was **not** part of the 36-file relevant regression above.

---

## Governance

| Check | Command | Result |
|---|---|---|
| Migration governance | `node scripts/migration-governance-guard.cjs` | **OK — last tag 0097** |
| Schema verification | `node scripts/verify-schema-deployment.cjs` | **OK** — `payment-collection-facts` present |
| 0098 | journal / drizzle listing | **absent** |

---

## Architecture guards

**PASS** for this program’s guards and the updated Collection Fact / Revenue Union consumer guards.

Proved: Cashier consumes the contract; does not define it; does not own persistence; no payments table / Payment aggregate; no second tax engine; Confirm does not INSERT `payment_collection_facts`; ST/OS/SR do not mutate Collection Fact; Revenue Union remains the reporting resolver; no offline queue; no refund/void/complimentary CF kinds; no 0098.
