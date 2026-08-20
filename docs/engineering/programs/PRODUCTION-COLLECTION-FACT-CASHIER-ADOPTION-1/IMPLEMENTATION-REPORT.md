# IMPLEMENTATION-REPORT

Program: `PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1`

---

## Identity

| File | Change |
|---|---|
| `client/src/lib/cashier-workspace/cashierIdempotency.ts` | `newCashierPaymentIntentId()` → `cpi_` + UUID |
| `shared/operational-session/payment/collection-fact/cashierProductionPaymentIdentity.ts` | `assertCashierProductionPaymentIdentities` |
| `shared/operational-session/payment/collection-fact/index.ts` | export identity helpers |
| `client/src/components/cashier-workspace/CashierWorkspacePanel.tsx` | mint/reuse `paymentIntentRef`; send `paymentIntentId` on settle |
| `server/pos/api/posRouter.ts` | `paymentIntentId` on `pos.settlement.initiate` |
| `server/pos/services/PosSettlementInitiateService.ts` | require/forward intent, idempotency, terminal, actor; map `CollectionFactError` |

## Commit path

| File | Change |
|---|---|
| `server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts` | Check freeze → production command → `commitCollectionFact` |
| `server/operational-session/payment/PaymentConfirmService.ts` | Cashier `orderId` path: identity assert → settle hook → adapter |
| `server/operational-session/check/CheckService.ts` | optional `productionCollectionCommit` after money freeze, before `finalizeCheckOutcome` |
| `server/operational-session/payment/collection-fact/CollectionFactService.ts` | comment: Cashier Confirm is the first certified production caller |
| `server/operational-session/payment/collection-fact/index.ts` | export adapter |

Confirm does not INSERT `payment_collection_facts`. Check does not import the writer or table. `server/operational-session/payment/index.ts` still exports `confirmPayment` only.

Observability: existing Collection Fact ops events (attempt / committed / replayed / duplicate / validation / storage) plus Confirm `collectionFactCommit` / `collectionFactOutcome`.

---

## Tests added

| File | Tests |
|---|---|
| `cashierProductionCollectionFactAdoption.test.ts` | 14 |
| `cashierProductionCollectionFactAdoption.architecture.guards.test.ts` | 3 |

## Tests extended

| File | Change |
|---|---|
| `PaymentConfirmService.test.ts` | identity reject; terminal/actor reject; freeze commit = PAID; storage failure blocks `payment.confirm` |
| `posSettlementInitiate.order.test.ts` | command carries `paymentIntentId`; reject intent=`orderId`; CF storage → `collection_fact_rejected` |

## Architecture guards updated (adoption reason)

Confirm is now the certified consumer. Guards that required Confirm/writer to stay disconnected were updated to:

- Confirm **must** call `commitCashierProductionCollectionFact`
- Confirm/Check/POS/UI **must not** call `insertCollectionFact` / own `paymentCollectionFacts`
- writer comment is the certified first-caller statement

Files: Collection Fact architecture guards, production eligibility, commit-contract, execution-hardening, Revenue Union architecture guards.

Existing isolated BOTH, Check `checkId` Confirm, and Settlement writer tests were not rewritten to hide failures.

---

## Production safety

- No migration 0098
- No `mysqlTable("payments")`
- No synthetic production Collection Fact INSERT
- No deployment
- Schema terminus remains `0097_payment_collection_facts_production_purpose`
