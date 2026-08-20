# PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1 — Architecture Decision Report

**Decision: APPROVED**
**Cashier: NOT ADOPTED**
**PAID runtime: NOT CHANGED**
**Settlement: NOT CHANGED**
**ADR-039: not superseded** (no ADR edit)

This program establishes one small production commit contract on top of existing Collection Fact infrastructure (0096 + 0097). It does not add a financial authority, Payment aggregate, payments table, second PAID entity, or Revenue root.

---

## 1. Why a contract program now

0096 created insert-only `payment_collection_facts`. 0097 made `purpose=production` persistable. Production still has **0** Collection Fact rows. Cashier still settles through Check (`confirmPayment` → `settleCashierPosOrderPaidByIdDetailed`).

Before Cashier (or any other channel) may consume the writer, the platform must freeze:

- what snapshot is committed
- what identities mean
- what retry does
- what COMMITTED / PAID / HTTP SUCCESS mean
- what production validation requires versus isolated fixtures

Cashier must later **consume** this contract. Cashier must not define it.

---

## 2. Authority model (unchanged target)

| Concept | Meaning |
|---|---|
| Payment | collection **process** |
| Collection Fact | immutable **financial fact / financial authority** after certified adoption |
| PAID (adopted meaning) | successful Collection Commit outcome — same event as COMMITTED |
| PAID (legacy runtime today) | Check `outcome = paid` via Confirm — **unchanged by this program** |
| Check | operational/commercial bill; optional `checkId` reference only |
| ST / OS / SR | downstream settlement/publication |
| Revenue | reporting projection (Revenue Union) |
| Refund | future compensating event; must not UPDATE the original fact |

No second financial write exists between COMMITTED and PAID.

---

## 3. Identity map (diagram `paymentId`)

There is no `payments` table and no Payment aggregate. Diagram `paymentId` maps to **`paymentIntentId`**.

| Name | Role | Uniqueness |
|---|---|---|
| `restaurantId` | tenant | part of all uniqueness keys |
| `paymentIntentId` | payment identity (diagram paymentId) | unique per tenant |
| `idempotencyKey` | same logical commit attempt (retry / lost HTTP) | unique per tenant |
| `collectionFactId` | durable fact PK assigned at insert (`pcf_` + UUID) | globally unique; **not** business idempotency |
| `orderId` + `orderingChannel` + `restaurantId` | economic sale identity | not unique by itself (a sale may have more than one intent in split/retry-new-intent cases) |
| `checkId` | optional operational bill reference | **not** economic identity, **not** financial authority |
| `terminalId` | production-mandatory attribution snapshot | **not** financial identity |
| `actorType` / `actorId` | actor attribution snapshot | **not** financial identity |
| `businessDay` | attribution snapshot | **not** economic identity |

Deterministic retry:

```
same restaurantId + same idempotencyKey + same fingerprint
  → same Collection Fact (outcome=replayed)
  → NO duplicate financial fact
```

```
same restaurantId + same paymentIntentId + different idempotencyKey
  → CONFLICT
```

```
different paymentIntentId
  → different Collection Fact (must not collapse)
```

Forbidden as business idempotency: random UUID alone, timestamp windows, amount+terminal heuristics, fuzzy duplicate detection.

---

## 4. Production vs isolated writer rules

Isolated purposes (`synthetic|shadow|test|validation`) keep the existing infrastructure writer (terminal/actor may be omitted).

Production purpose (`purpose=production`) additionally requires:

- authorized actor
- non-empty `actorType`
- positive integer `actorUserId`
- non-empty `terminalId` (no "unknown terminal")
- tax breakdown total equals `taxAmount`
- composition `originOrderId`, if present, matches `orderId`

This split is explicit so test fixtures do not silently define production rules, and production does not inherit fixture convenience.

---

## 5. Terminal semantics

Production Collection Commit: **terminal is mandatory audit attribution**.

It is **not** part of financial identity (fingerprint does not include `terminalId`). First successful commit freezes `terminalId` on the fact. An identical retry (same idempotency key + fingerprint) returns the original fact, including the original terminal, even if the retry context carries a different terminal.

"Unknown terminal" is not a production value.

---

## 6. Finality

| Label | Meaning |
|---|---|
| PAYMENT COMMIT | attempt to persist the immutable Collection Fact |
| COMMITTED | insert succeeded, or idempotent replay of that insert |
| PAID | the same committed fact; **not** a second financial authority or write |
| HTTP SUCCESS | transport acknowledgement after PAID |
| ST / OS / SR | downstream; **must not** mutate or invalidate the fact |

COMMITTED and PAID are **one atomic financial outcome represented by two semantic labels**.

A permanently committed Collection Fact is PAID in the adopted meaning. Lost HTTP after DB commit is recovered by retry → `replayed` → same PAID fact.

This program does **not** change today's Confirm PAID path. Legacy Check PAID remains the live runtime until a later adoption program.

---

## 7. Downstream failure

Once the Collection Fact is committed, ST/OS/SR failure is downstream recovery. UPDATE/DELETE of the fact remain `IMMUTABLE`. This program does not implement settlement recovery.

---

## 8. Refund / void / complimentary

**Governed future dependency. Not invented here.**

Kind remains `collection`. Correction later = original fact + compensating event, never UPDATE.

This gap continues to block Cashier adoption. It does not block certifying the production **commit** contract for collection.

---

## 9. Schema / migration

Existing 0096/0097 columns already hold the required snapshot. **No 0098.** No production INSERT. No backfill.

If a future adoption program needs a column, that is a separate authorized migration. This program would have STOPped rather than add one.

---

## 10. Channel independence

The contract lives under `shared/operational-session/payment/collection-fact/`. It does not import Cashier. `orderingChannel` is required economic metadata, not a Cashier exclusive. The same assert/writer path accepts `waiter_tablet` (and any other registered channel) with a real terminal and actor.

Payment process (`confirmPayment`) remains the process boundary. Collection Fact remains the financial fact. They are not merged.
