# PAYMENT-COLLECTION-ARCHITECTURE-1

Certified baseline HEAD: `3211d73671d72ca5c24e39d20d614a877e290c0b`
Branch: `main`
Production schema: **0095_check_charges** (unchanged; no 0096)

Prior certified programs:

- BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 = PASS
- BILL-CHARGE-COMPOSITION-HARDENING-1 = PASS
- BILL-FINANCIAL-LIFECYCLE-HARDENING-1 = PASS (`3211d736`)

## A. Executive Summary

The current Payment/collection fact is already `check_settlement_transactions`. It is written atomically with Bill → PAID inside `settleCheckPaidByIdDetailed`. That command is the financial collection entry point.

This program **reuses** that storage. It does **not** create a `payments` table, Payment Aggregate, PaymentEngine, or migration 0096.

The only code change is making **amount due** an explicit Bill-owned formula:

```
amountDue = Bill.grandTotal − SUM(captured monetary settlement transactions)
```

Complimentary lines are excluded (Bill outcome, not Payment). Overpayment is rejected. Collection still happens as one atomic full-cover settle. Partial tenders are UI-only until confirm.

**Result: PASS**

## B. Current Payment Architecture

There is no separate Payment aggregate in the cashier/Session/self-order paid path.

| Layer | Role |
|---|---|
| `check_settlement_transactions` | Collection fact (tender, amount, currency, timestamp, status) |
| `settleCheckPaidByIdDetailed` | Collection command + Bill PAID + SR + Order Settlement |
| POS `settlement.initiate` | Order-keyed façade → Check settle |
| Session `markPaid` | Session façade → Check settle |
| `SettleOrderPaidService` | Order-keyed façade → Check settle |
| `check_split_payments` | Separate FSP/commercial Split Payment domain. **Not** the cashier collection path. Not promoted. Not deleted. |

## C. Existing Settlement Transactions

Table `check_settlement_transactions` (0070, sessionId nullable in 0072):

- `restaurantId`, `checkId`, `sessionId`
- `paymentMethod`, `amount`, `currencyCode`
- `status` (`captured` / `pending` / `voided` / `refunded`)
- `businessTimestamp`, `reference`, `externalReference`, `notes`

This is sufficient as Payment/collection storage:

- Bill identity, tenant, amount, currency, tender, timestamp, correlation refs

Missing on the row: durable idempotency key. Idempotency lives at the POS command store (in-memory) and at Check finalize (`WHERE outcome='open'`). That is accepted. A unique payment idempotency column would be 0096 without a proven storage failure — **not created**.

Complimentary may appear as `paymentMethod = complimentary` on a complimentary Bill. That is a Bill-outcome publication, not a Payment. `capturedCollectionAmounts` ignores it.

## D. Existing Order Settlement

`check_order_settlements` is Check-owned Order coverage (ADR-022). It snapshots `orderTotalSnapshot` and `settledAmount`. It is applied inside the same finalize TX (`applyFullSettlementToCheckOrders`). It is **not** Bill amount authority and was not redesigned.

It may coexist as Order financial publication. Retirement remains a later program.

## E. Current Mark-Paid Flow

```
UI / API
  ↓
POS settlement.initiate  OR  session.markPaid  OR  settleOrderPaid
  ↓
discover Check (membership / activeCheckId)
  ↓
settleCheckPaidByIdDetailed
  ↓
lock OPEN Bill
  ↓
reload Charges → compute Bill money
  ↓
amountDue = grandTotal − captured collection
  ↓
validate tenders (exact cover, amount > 0, no complimentary method)
  ↓
finalizeCheckOutcome (OPEN → PAID) + insert ST + OS apply + Settlement Record
```

What makes Bill PAID: `finalizeCheckOutcome` `UPDATE … WHERE outcome='open'`. Collection lines are persisted in the same TX. One winner. Loser throws `CheckTransitionError`.

## F. Target Payment Boundary

```
POS / Cashier / Session
        ↓
settleCheckPaidByIdDetailed   ← collection command (existing name)
        ↓
Bill (Charges + frozen tax + discount)
        ├── amountDue
        └── Payment facts = check_settlement_transactions
                ↓
            Bill = PAID
                ↓
        Existing Settlement Record publication
```

No second command layer named `collectPayment`. Existing Check settle **is** that command.

## G. Bill/Payment Relationship

- Bill answers how much is owed (`grandTotal` from Charges).
- Payment answers what was collected (captured ST, excluding complimentary).
- `remainingCollectible(grandTotal, capturedAmounts)` is the amountDue formula.
- Currency is copied from the Bill snapshot, never from Order/Session.
- Tenant: `payment.restaurantId = bill.restaurantId`.

## H. Idempotency

| Path | Behavior |
|---|---|
| POS `idempotencyKey` | In-memory store; same fingerprint replays; conflict if reused differently |
| Check finalize | Duplicate PAID throws `CheckTransitionError` |
| `SettleOrderPaidService` | If already PAID, returns existing Settlement Record |

No new idempotency framework. ST rows have no unique payment key.

## I. Concurrency

Existing Check-owned TX + `touchOpenCheck` + `finalizeCheckOutcome WHERE outcome='open'`. Two cashiers: one PAID, the other fails deterministically. Payment + void / complimentary: same lock. Over-collection cannot commit because the losing command never inserts ST.

## J. Multi-Tender / Partial Payment

- **Multi-tender:** already supported as multiple ST lines that **sum exactly** to amountDue in one settle (`cash` + `card`).
- **Partial persistence:** not a product path. Cashier remaining is UI draft until confirm. Bill stays OPEN until full cover. `isCheckFullyCoveredBySettlements` remains a helper, not a write API.
- **Overpayment:** reject (`assertPaidSettlementLines` / amountDue).
- **Zero/negative tender:** reject (except a zero-obligation Bill with omitted tenders keeps the historical `other`/`0.00` default line).

## K. Terminal State Rules

- PAID: new collection rejected (`CheckTransitionError`). POS may replay its idempotency record. SettleOrderPaid may return existing SR.
- COMPLIMENTARY / VOIDED: new Payment rejected.
- No reopen.

## L. Order Isolation

Check collection does not load Order totals or Session `ordersTotalAmount`. POS/SettleOrderPaid still **discover** the Check via Order membership — correlation only. Cashier UI may show an Order-total fallback while Check read is preparing (`amountDueIsOrderFallback`); confirm is disabled until Check grandTotal is available. That presentation path was not redesigned.

## M. Refund Boundary

Unchanged. `refundableBalance` is derived from Settlement Record history (`refundBudget.ts`), not from ST and not from this collection formula.

## N. Settlement Boundary

Settlement Record still published in the same finalize TX. Payment is not a second SR root. SR payment snapshots remain Payment Method Analytics authority.

## O. Reporting Boundary

- Revenue = SUM(paid Check / published SR grandTotal). Unchanged.
- Payment Method Analytics = SR payment snapshots (canonical). ST adapter is legacy dual-run / rollback only.
- Complimentary ST lines are excluded from monetary collection analytics.

## P. Schema Decision

**Reuse `check_settlement_transactions`. No 0096. No `payments` table.**

The table already stores collection facts. A duplicate Payment table would be a second SSOT. Durable row-level payment idempotency is a future optional column, not required to make collection correct.

`check_split_payments` remains a separate commercial Split Payment capability. It is not the Bill collection SSOT.

## Q. Tests

Primary suite after this program: **83 passed** (settlement invariants, collection guards, CheckService lifecycle + m3/m4 + concurrency + financialTxn + orderSettlement).

Coverage includes: full collect → PAID; tender + Bill currency; remaining = Bill − captured; overpayment; zero amount; complimentary is not Payment; terminal reject; concurrency; Charge-derived money (no Order totals).

## R. Architecture Guards

`shared/operational-session/__tests__/paymentCollection.architecture.guards.test.ts`:

1. No `payments` table / no 0096
2. Collection uses `remainingCollectible` / ST, not Order or Session totals
3. Currency from Bill snapshot
4. Revenue remains Check/Bill
5. No PaymentEngine / no Refund redesign
6. Order Settlement is not Bill amount authority

## S. Production Validation

Read-only probe at `2026-08-19T01:02:15.527Z`:

| Gate | Result |
|---|---|
| Access | Production TiDB Cloud `mineuqr` |
| Journal terminus | **0095** hash `02f6ad22…12d08cca` (id `6234102`) |
| 0096 | **absent** |
| Historical rewrite | none (this program has no migration) |

No real customer collection was performed. Existing ST / Checks / SR / OS / Revenue were not rewritten.

## T. Remaining Gaps

- POS collection is still Order-keyed discovery. Financial rules stay on Check.
- POS idempotency store is in-memory (process-local). Not a new framework in this program.
- Durable ST idempotency key is not added (would be 0096).
- Incremental persisted partial payments are not implemented.
- Split Payment (`check_split_payments`) remains a parallel FSP domain.
- Cashier Order-total fallback display remains presentation-only.
- `remainingCollectible` is derived at settle time, not a stored Bill field.

## U. Complexity Review

CURRENT:

```
Order/Session façade → Check settle → ST + OS + SR
```

TARGET / AFTER:

```
Order/Session façade (correlation)
        ↓
Bill (Charges → obligation)
        ↓
amountDue = grandTotal − captured ST
        ↓
Payment fact = check_settlement_transactions
        ↓
Bill = PAID
        ↓
Existing SR publication
```

Not created: second financial root, duplicate Payment table, PaymentEngine, PaymentAggregate, event bus, migration.

## V. Final PASS / BLOCKED

**PASS**

Bill remains the obligation authority. `check_settlement_transactions` is the collection fact. Payment does not use Order or Session totals. Full collection marks PAID atomically. Overpayment is rejected. Terminal Bills reject new collection. Revenue stays Check/Bill based. Refund and Settlement Record were not redesigned. No 0096.
