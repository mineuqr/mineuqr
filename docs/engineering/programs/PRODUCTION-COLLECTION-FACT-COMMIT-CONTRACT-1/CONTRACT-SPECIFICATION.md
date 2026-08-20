# PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — Contract Specification

Canonical production Collection Fact commit contract. Channel-independent. Not Cashier-owned.

**Scope:** what must be true, and what exact financial snapshot must be committed, for a Payment Commit to become the platform's immutable financial fact.

**Out of scope:** Cashier UI, Confirm/PAID runtime, Settlement writers, refund/void/complimentary kinds, production writes, 0098.

---

## 1. Preconditions

A production Collection Fact may be committed only when **all** hold:

1. `purpose === production`
2. `kind === collection`
3. actor is authorized
4. tenant context `restaurantId` equals command `restaurantId`
5. economic identity is present: `restaurantId` + `orderingChannel` + `orderId` (positive integers / non-empty channel)
6. payment identity is present: non-empty `paymentIntentId` (≤ 128)
7. retry identity is present: `idempotencyKey` length 8–128
8. amount > 0, canonical decimal money, tenders reconcile to amount, tender methods are `cash|card|other`
9. currency code is non-empty and matches `currencySnapshot.currencyCode`
10. tax/discount/subtotal are canonical decimal strings; `taxBreakdown.totalTaxAmount` equals `taxAmount`
11. composition has ≥ 1 line; `originOrderId` if set equals `orderId`
12. `businessDay` is `YYYY-MM-DD`
13. production `terminalId` is non-empty (≤ 128)
14. production `actorType` is non-empty; `actorUserId` is a positive integer
15. no conflicting Collection Fact exists for the tenant+intent or tenant+idempotency key

Validation is intentionally small. Settlement, reporting, printing, realtime, and OS/SR are **not** on this path.

Isolated purposes are **not** this contract. They may omit terminal/actor.

---

## 2. Immutable financial snapshot

Committed fact fields (existing schema; no new columns):

| Field | Why it exists |
|---|---|
| `restaurantId` | tenant isolation |
| `collectionFactId` | durable fact identity (`pcf_` + UUID at insert) |
| `paymentIntentId` | payment identity (diagram `paymentId`) |
| `orderId` | economic sale identity |
| `orderingChannel` | economic sale identity / channel of origin |
| `amount` | authoritative collected amount |
| `currencyCode` + `currencySnapshot` | authoritative currency + frozen display/policy |
| `subtotal` | frozen net-before-tax component of the snapshot |
| `discountAmount` | frozen discount total |
| `taxAmount` + `taxPolicySnapshot` + `taxBreakdown` | frozen tax |
| `composition` | frozen lines so reporting need not reread Order/Check |
| `tenders` | frozen tender breakdown |
| `actorType` + `actorId` | actor attribution |
| `terminalId` | terminal attribution (mandatory in production) |
| `businessDay` | business-day attribution (not identity) |
| `committedAt` / `createdAt` | commit timestamp |
| `idempotencyKey` | retry identity |
| `fingerprint` | SHA-256 of the financial payload |
| `checkId` | optional operational bill reference; never authority |
| `purpose` / `kind` / `schemaVersion` | production collection fact, schema 1 |

After commit these must not change: amount, currency, tax snapshot, discount snapshot, tender composition, sale/order economic reference, cashier/actor, terminal, business day, timestamp, payment identity, idempotency identity.

Financial truth **must not** depend on rereading mutable Order/Check state after commit. `checkId` may identify the originating bill; it does not authorize later mutation of the fact from Check.

Fingerprint payload includes restaurant, order, intent, channel, purpose, money, tax/currency snapshots, composition, tenders, business day, and checkId. It does **not** include terminal or actor (attribution, not identity).

---

## 3. Idempotency

Same logical payment commit attempt = same tenant + same `idempotencyKey`.

| Incoming vs stored | Result |
|---|---|
| same key, same fingerprint, same intent/order/restaurant | `replayed` — return stored fact |
| same key, different fingerprint | `CONFLICT` — no insert |
| same intent, different key | `CONFLICT` — no insert |
| different intent + different key | new fact |

`collectionFactId` is assigned at insert and is not chosen by the caller as business idempotency.

Retry after network timeout or lost HTTP response: repeat the same command+key → `replayed` → same fact. That replay **is** PAID (same committed fact).

---

## 4. Economic identity

A production fact belongs to one economic sale: `restaurantId` + `orderingChannel` + `orderId`.

Prevents:

- orphan facts (`orderId` required)
- reuse of one fact for another sale (fingerprint + intent uniqueness)
- cross-tenant attribution (context restaurant must match command)
- accidental reuse of an old payment identity (intent uniqueness + CONFLICT)
- ambiguous Cashier-to-sale association (orderId + channel required; Cashier does not own the contract)

Business day is attribution only.

---

## 5. Commit / finality

```
PAYMENT COMMIT
  → Collection Fact committed (insert or replay)
  → COMMITTED
  → PAID          ← same event, second label, not a second write
  → HTTP SUCCESS  ← transport
  → ST / OS / SR  ← downstream, not in this transaction
```

`commitCollectionFact` outcomes:

- `created` → COMMITTED = PAID
- `replayed` → COMMITTED = PAID (same fact)

There is no intermediate financial state in the canonical lifecycle. Isolated test/shadow writes are not production PAID.

---

## 6. Failure semantics

| Case | Behavior |
|---|---|
| Duplicate identical request | `replayed`, same fact |
| Retry after timeout / lost response | `replayed`, same fact |
| Validation / tender / terminal / identity failure | no insert; `VALIDATION` / `UNAUTHORIZED` / `TENANT` |
| Conflicting payload on same idempotency key | no insert; `CONFLICT` |
| Duplicate payment intent with a different key | no insert; `CONFLICT` |
| Downstream ST/OS/SR failure after commit | fact unchanged; UPDATE/DELETE throw `IMMUTABLE` |

---

## 7. Immutability enforcement

1. **Domain:** Collection Fact is `Readonly`; corrections are compensating events (future).
2. **Service:** writer inserts or replays; no update API.
3. **Repository:** `updateCollectionFact` / `deleteCollectionFact` throw `IMMUTABLE`.
4. **Database:** insert-oriented table; uniqueness on fact id, tenant+intent, tenant+idempotency. Ordinary money UPDATE is not part of the contract.
5. **Architecture guards:** Confirm/Cashier/Settlement must not call the writer in this program.

---

## 8. Channel independence

Any payment channel that can supply the production snapshot, identities, actor, and terminal may later call this contract. The contract does not import Cashier and does not special-case `cashier_pos` as financial identity.

Payment process domain (`confirmPayment`) is not replaced. Collection Fact is not a workflow engine.
