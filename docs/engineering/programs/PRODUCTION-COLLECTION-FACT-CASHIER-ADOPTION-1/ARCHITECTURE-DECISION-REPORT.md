# PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1 — Architecture Decision Report

**Decision: ADOPT CASHIER AS A CLIENT OF THE CERTIFIED CONTRACT**
**Cashier: ADOPTED**
**Collection Fact contract / writer / execution / Revenue Union: CONSUMED, NOT REDEFINED**
**Migration: 0097 (no 0098)**
**Deployment: NOT DEPLOYED**

---

## 1. What this program is allowed to do

This is the first certified program allowed to connect:

```
CASHIER → Sale/Order → Payment UI → CONFIRM → PAYMENT COMMIT
  → IMMUTABLE PRODUCTION COLLECTION FACT
  → COMMITTED / PAID
  → HTTP SUCCESS
  → ST / OS / SR → REPORTING
```

Cashier consumes the financial system. It does not become the financial system.

Immutable inputs:

1. 0097 Payment Collection Fact Production Purpose
2. PRODUCTION-COLLECTION-FACT-COMMIT-CONTRACT-1
3. PRODUCTION-COLLECTION-FACT-COMMIT-EXECUTION-HARDENING-1
4. REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1

No parallel Collection Fact contract. No Payment aggregate. No `payments` table.

---

## 2. Payment identity

Cashier must supply a legitimate `paymentIntentId` for the payment attempt.

| Identity | Source | Must not be |
|---|---|---|
| `paymentIntentId` | client-minted once per settle attempt: `cpi_` + UUID | `orderId`, `idempotencyKey`, `collectionFactId` |
| `idempotencyKey` | existing POS settle retry key `cashier-settle-…` | payment identity |
| `collectionFactId` | writer-assigned `pcf_` + UUID at insert | payment identity |
| `orderId` | economic sale | payment identity |
| `terminalId` / actor | POS terminal + authenticated staff user | optional / `"unknown"` |

Retry reuses the same `paymentIntentRef` and the same POS `idempotencyKey`. A new sale mints a new intent. The server rejects missing intent, intent equal to `orderId`, intent equal to `idempotencyKey`, or intent prefixed `pcf_`.

This is not a payments table. It is a payment-attempt identifier required by the already-certified contract.

---

## 3. Certified fingerprint vs the adoption test list

The adoption brief asked: same idempotency key + changed terminal/actor → CONFLICT.

The certified contract says terminal and actor are **attribution snapshots**, not fingerprint fields. Same `restaurantId` + `idempotencyKey` + same financial fingerprint **replays** the original fact, including the original terminal/actor.

**Follow the certified contract.** Missing/invalid terminal or actor is VALIDATION (no insert). Retry with a different terminal/actor and an identical financial payload is **replay**, not CONFLICT.

---

## 4. Money freeze

Collection Fact is built from the Check-owned paid freeze after in-TX `computeCheckMoney` on frozen Check charges/snapshots:

- amount / subtotal / discount / tax / tax breakdown / tax policy snapshot
- currency snapshot
- tenders and composition
- `checkId`, `businessDay`, `orderId`, `orderingChannel = cashier_pos`

Cashier does not re-read live Business Settings to reconstruct tax, discount, or tenders. Confirm does not call `computeCheckMoney`. The adapter maps freeze → `commitCollectionFact`.

---

## 5. Atomicity

`commitCollectionFact` runs **inside** the Check-owned write TX **after** money freeze and **before** Check PAID + ST/OS/SR, on a **separate Drizzle connection** (not the Check `tx` client).

| Case | Result |
|---|---|
| CF created | payment is PAID; downstream proceeds; HTTP success may follow Confirm return |
| Identical retry | CF replayed; one insert; PAID |
| Persist succeeded / response lost | retry replays; no second fact |
| Validation / storage failure | no CF; Check TX does not finalize PAID; no `payment.confirm` success log |
| Downstream ST/OS/SR fails after CF | CF remains immutable; Check TX rolls back operational PAID/ST; retry recovers via replay |

COMMITTED and PAID are one financial commit: successful Collection Fact insert or replay.

HTTP SUCCESS is transport after Confirm returns. Confirm returns only after the Check settle path returns, which for Cashier `orderId` requires the production Collection Fact hook to succeed.

Session / kiosk `checkId` Confirm is **unchanged** and does not write Collection Facts.

---

## 6. What was not done

- No Session / Kiosk / Waiter adoption
- No refund / void / complimentary Collection Fact kinds
- No offline financial mode
- No 0098
- No production INSERT of synthetic facts
- No Revenue Union authority rewrite

---

## 7. Architecture-guard expectation updates

Existing guards forbade Confirm from containing `commitCollectionFact`. Confirm now calls `commitCashierProductionCollectionFact` (the certified consumer adapter). That string contains the writer name as a substring.

Those guards were updated to require Confirm to call the adapter and to forbid Confirm/Check/POS/UI from calling `insertCollectionFact`, `paymentCollectionFacts`, or owning persistence. This is the certified adoption, not a weakened invariant.
