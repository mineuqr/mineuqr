# RECONCILIATION-REPORT

Program: `PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1`

This program does **not** change Revenue Union authority. It connects Cashier so a production Collection Fact can exist for a Cashier payment. Union proofs remain the certified production-authority matrices.

Production Collection Fact row count was **not** increased in live production (no production writes; not deployed). Last certified live baseline: **0**. After this program: **0**.

---

## Cashier financial publication (unit / in-memory)

| Event | Collection Facts | PAID | HTTP / Confirm log |
|---|---|---|---|
| First commit | 1 insert, `created` | yes | only after commit |
| Identical retry | 0 extra inserts, `replayed` | yes | safe |
| Changed amount/tax/tender/order/currency/business day, same idempotency key | 1 fact remains; CONFLICT | no second PAID | no success |
| Distinct `paymentIntentId` | distinct facts | distinct payments | — |
| Storage failure | 0 facts | no | no `payment.confirm` |
| Downstream failure after insert | fact unchanged; retry replays | operational Check TX rolls back | retry recovers |

One Cashier payment attempt → one immutable production Collection Fact.

---

## Revenue Union (unchanged authority)

| Fixture | Union Gross |
|---|---|
| Legacy SR only | existing legacy Gross |
| Valid production CF + proven SR overlap | **CF only** (SR excluded from Gross) |
| Production CF without proven overlap | no unsafe suppression of legitimate legacy |
| Unresolved overlap | publish neither for that transaction |
| Duplicate production facts | no double publication |
| Unrelated BOTH / isolated | existing BOTH semantics unchanged |
| Refund reporting | existing compensating SR behavior |

`revenueUnion.test.ts` **20 passed**. `revenueUnionProductionAuthority.test.ts` **17 passed**. Business Metrics overlap publication **passed**. Refund reporting **7 passed**.

There is still exactly one published Gross contribution for a proven production overlap. Cashier adoption does not publish Collection Fact Gross + Settlement Record Gross for the same economic payment.

---

## Check vs Collection Fact

| Role | Authority |
|---|---|
| Check | operational bill; existing PAID outcome write remains |
| Collection Fact | immutable financial fact for the Cashier payment commit |
| ST / OS / SR | downstream of CF; not a second money root |
| Revenue Union | reporting authority resolver |

Collection Fact is not the operational Check. Check is not deleted or replaced.
