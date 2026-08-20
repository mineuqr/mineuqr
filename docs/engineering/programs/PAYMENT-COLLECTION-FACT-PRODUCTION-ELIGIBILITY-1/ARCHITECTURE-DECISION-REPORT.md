# PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1 — Architecture Decision Report

**Decision: APPROVED WITH GOVERNED GAPS**  
**Cashier: NOT ADOPTED**  
**ADR-039: not superseded** (no ADR edit)

---

## 1. What distinguishes production from isolated facts

| Purpose | Persistable | Published Revenue |
|---|---|---|
| `synthetic` | yes (0096) | never |
| `shadow` | yes (0096) | never |
| `test` | yes (0096) | never |
| `validation` | yes (0096) | never |
| `production` | yes **after 0097** | yes, if valid and not BOTH/UNRESOLVED |

`production` means: committed immutable collection authority for a real restaurant collection. It does **not** mean Cashier adopted, PAID changed, or Settlement rewritten.

---

## 2. Is a production purpose required?

**Yes.** Without a distinct persistable purpose, isolated rows cannot be reliably excluded from Published Revenue. An empty allowlist (prior program) prevented contribution entirely. Eligibility requires a named production purpose that cannot be confused with test/shadow data.

---

## 3. Is schema migration required?

**Yes.** 0096 MySQL enum is `synthetic|shadow|test|validation`. TypeScript-only `production` would split-brain (writer accept, DB reject). Additive enum expansion is the minimum change.

No new table. No `payments` table. No Check/Settlement ALTER. No backfill INSERT.

---

## 4. Mandatory immutable financial fields

Unchanged from 0096: `amount`, `taxAmount`, `subtotal`, `discountAmount`, `currencyCode`, `currencySnapshot`, `taxPolicySnapshot`, `tenders`, `businessDay`, `committedAt`, `fingerprint`. UPDATE/DELETE remain forbidden (`I-COL-02`).

---

## 5. Identity / idempotency

Unchanged uniqueness:

- `collectionFactId` unique
- `(restaurantId, paymentIntentId)` unique
- `(restaurantId, idempotencyKey)` unique

Replay with same fingerprint is idempotent; conflicting payload is `CONFLICT`.

---

## 6. Economic transaction identity (Revenue Union)

Unchanged composite identity:

- Legacy: `check:{restaurantId}:{checkId}`
- Fact: `intent:{restaurantId}:{paymentIntentId}`
- Sale overlap: `sale:{restaurantId}:{orderingChannel}:{orderId}`
- Optional Check overlap: `checkref:{restaurantId}:{checkId}`

---

## 7. BOTH / UNRESOLVED / duplicates

Unchanged: BOTH and UNRESOLVED never publish. Duplicates collapse. Isolated facts still cannot BOTH-suppress published Check Revenue.

A **production** fact + paid Check for the same sale/check identity → BOTH → 0 published contributions.

---

## 8. Invalid production facts

Eligible purpose plus failed validation (amount, currency, business day, identity) → `UNRESOLVED` → not published.

---

## 9. Refund / void / complimentary

**Not invented.** Kind remains `collection`. Complimentary and void remain Check/SR. Refund remains compensating SR; original fact is never UPDATE-mutated.

**Governed gap:** a production Collection Fact without a Check has no Collection Fact-native refund path. This **blocks Cashier adoption**, not the definition of paid-collection production eligibility. Zero production rows today makes the gap non-operational.

---

## 10. Minimum evidence before Collection Fact money is published in production

1. 0097 applied (not done).
2. Valid `purpose=production` facts exist (none; no authorized producer).
3. Cashier still must not write them until compensating events are governed.
4. Zero-row / isolated-only window: Published Union = legacy SR Revenue (proven in tests).

ADR-039 remains governance. This program does not certify a channel as Collection-Authority-adopted.
