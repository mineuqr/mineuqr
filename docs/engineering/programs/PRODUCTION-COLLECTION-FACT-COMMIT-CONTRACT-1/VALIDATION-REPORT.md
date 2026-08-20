# PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — Validation Report

**Status: VALIDATED — NOT ADOPTED**

Production Collection Facts were **not** written. Existing tests were **not** modified or weakened.

---

## Commands and results

### A. Contract + Collection Fact + mandated financial/reporting/Cashier/migration suites

```
pnpm exec vitest run
  shared/reporting-platform/revenue-union/__tests__/revenueUnion.test.ts
  server/reporting-platform/__tests__/revenueUnion.architecture.guards.test.ts
  server/reporting-platform/__tests__/revenueUnionPublished.architecture.guards.test.ts
  server/reporting-platform/__tests__/RevenueUnionService.test.ts
  server/reporting-platform/__tests__/BusinessMetricsService.settlementRecord.test.ts
  server/reporting-platform/__tests__/refundReportingAdoption.test.ts
  server/operational-session/payment/collection-fact/__tests__/CollectionFactService.test.ts
  server/operational-session/payment/collection-fact/__tests__/collectionFact.architecture.guards.test.ts
  server/operational-session/payment/collection-fact/__tests__/collectionFactProductionEligibility.architecture.guards.test.ts
  shared/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommitContract.test.ts
  server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommit.test.ts
  server/operational-session/payment/collection-fact/__tests__/productionCollectionFactCommit.architecture.guards.test.ts
  scripts/__tests__/migrationGovernance.test.ts
  server/operational-session/payment/__tests__/paymentConfirm.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierDirectFinancialCommit.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierPaymentFlow.architecture.guards.test.ts
  client/src/lib/cashier-workspace/__tests__/cashierWorkspace.architecture.guards.test.ts
  server/operational-session/payment/__tests__/paymentConfirmRemainingCallers.architecture.guards.test.ts
  server/reporting-platform/__tests__/revenueUnionPublication.test.ts
```

**19 files / 137 tests — all passed.**

### B. Additional Confirm / settlement HTTP / refund-reporting guards

```
pnpm exec vitest run
  server/operational-session/payment/__tests__/PaymentConfirmService.test.ts
  server/operational-session/payment/__tests__/paymentConfirmCompatibilityCleanup.architecture.guards.test.ts
  server/operational-session/payment/__tests__/paymentConfirmCriticalPathTrim.architecture.guards.test.ts
  server/pos/__tests__/cashierSettlementHttpAtFinancialCommit.architecture.guards.test.ts
  shared/reporting-platform/__tests__/reportingRefundAdoption.architecture.guards.test.ts
```

**5 files / 23 tests — all passed.**

### Combined

**24 files / 160 tests — all passed.**

New tests in this program: **27** (12 contract + 11 writer + 4 architecture).
Existing Collection Fact service tests: **13 — unmodified, still passing.**

### C. Migration governance

```
node scripts/migration-governance-guard.cjs
```

**OK** — journal 98 entries, tail `0097_payment_collection_facts_production_purpose`. No 0098.

---

## Required gates A–X

| Gate | Result |
|---|---|
| A Valid production Collection Fact | PASS — in-memory commit, purpose=production, frozen snapshot |
| B Invalid amount | PASS — `0.00` rejected, no insert |
| C Invalid currency | PASS — snapshot mismatch rejected |
| D Missing economic identity | PASS — `orderId=0` rejected |
| E Cross-tenant mismatch | PASS — `TENANT` |
| F Missing/invalid terminal (production) | PASS — production requires terminal; isolated may omit |
| G Invalid business day | PASS |
| H Missing payment identity | PASS |
| I Missing idempotency identity | PASS |
| J Duplicate idempotency request | PASS — replay or `CONFLICT` on payload change |
| K Duplicate payment intent | PASS — `CONFLICT` on different key |
| L Retry returns same financial outcome | PASS — `replayed`, same `collectionFactId` |
| M Different payment does not collapse | PASS — second intent creates second fact |
| N Immutable fields cannot change | PASS — UPDATE/DELETE `IMMUTABLE` |
| O Fact does not depend on mutable Check after commit | PASS — mutated local Check does not change stored amount |
| P No second financial authority | PASS — kind=`collection`; no payments table; writer not Confirm |
| Q No second PAID entity | PASS — `created`/`replayed` are PAID labels of the same fact |
| R Downstream ST/OS/SR failure does not invalidate fact | PASS — simulated SR throw; fact unchanged; UPDATE forbidden |
| S No Cashier import/adoption | PASS — panel/settle/sale/router do not call writer or contract |
| T No PaymentConfirm adoption | PASS — Confirm still `settleCheckPaidByIdDetailed`; no `commitCollectionFact` |
| U No production Collection Fact write from runtime Cashier | PASS — Cashier paths do not call writer |
| V No new payments table | PASS — schema guard `mysqlTable("payments")` absent |
| W No migration beyond approved scope | PASS — journal tail 0097; no 0098 SQL |
| X Channel-independent | PASS — contract has no Cashier import; `waiter_tablet` commits under the same rules |

---

## Existing tests

**None modified. None deleted. None weakened.**

`CollectionFactService.test.ts` still covers isolated uniqueness, replay, conflict, immutability, and production-purpose persist in the isolated store (that test already supplies terminal+actor, so production-strict rules do not break it).

---

## Production verification

This program performed **no** production writes and **no** production migration. Read-only production row count was certified **0** by program 0097 (`347acc52`) and is unchanged by this work (application not deployed; writer not on Confirm).
