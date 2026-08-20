# REVENUE-UNION-PUBLISHED-ADOPTION-1 — Architecture Decision Report

**Decision: APPROVED WITH GOVERNED GAPS**
**Pipeline: PUBLISHED**
**Collection Fact contribution: NOT ADOPTED**

Authority: [ADR-ARCH-039](../../../architecture/adrs/ADR-ARCH-039-payment-collection-financial-authority.md) I-REV-U-01 / I-REV-U-02. Baseline: REVENUE-UNION-ADOPTION-1 (shadow).

---

## 1. Governed financial model (unchanged)

Payment = collection process. Collection Fact = immutable financial authority. PAID = committed Collection Fact (adopted channels) or Check `outcome=paid` (legacy). Check = operational/commercial bill. Settlement = downstream publication. Revenue = reporting projection from the resolved authority. Refund = compensating event.

This program does not alter that model. It changes **which code path publishes Revenue**, not who writes financial facts.

---

## 2. GATE 1 — Production Collection Fact purpose

**Required before a fact may enter Published Revenue: yes.**

Persistable 0096 purposes remain `synthetic | shadow | test | validation`. Adding `production` to the MySQL enum would be a schema change. This program **does not** create a migration (hard stop §31).

Governance instead:

```ts
PUBLISHED_COLLECTION_FACT_PURPOSES: readonly CollectionFactPurpose[] = []
```

Eligibility `published` accepts only that allowlist. Isolated purposes never publish. Existing shadow/test rows cannot accidentally enter Published Revenue.

A future schema program may add `production` **only if** Collection Fact-native compensating events are also governed. Do not treat this empty allowlist as a silent `production` enum.

---

## 3. GATE 2 / §6 — Collection Fact refund boundary

Collection Fact infrastructure still has kind `collection` only. There is no CF-native refund.

**Temporary refund boundary (proven):** Collection Facts cannot be a published Revenue authority until a Collection Fact-native compensating model exists. Published Net continues to subtract **legacy refund Settlement Records only**. Original Collection Facts remain insert-only. This program does not invent refunds.

If a future producer writes a persistable production fact before CF refunds exist, that fact still cannot publish (empty allowlist). **STOP** rather than workaround.

---

## 4. GATE 3 / §7 — Complimentary / void

No new Collection Fact kinds. Complimentary and void remain legacy Check/SR outcomes: counted, **not** Gross. If publication later requires CF-native complimentary/void, that is a separate architecture decision. Not invented here.

---

## 5. Authority classifier

Deterministic class per economic transaction:

`LEGACY_CHECK | COLLECTION_FACT | UNRESOLVED | BOTH`

BOTH and UNRESOLVED never publish. No silent prefer-Check or prefer-Fact. Invalid eligible facts are UNRESOLVED (fact-level) and do not suppress a valid paid Check unless BOTH applies to two **valid** authorities.

---

## 6. Canonical identity

No single identifier is sufficient.

| Role | Key |
|---|---|
| Legacy contribution | `check:{restaurantId}:{checkId}` |
| Collection Fact contribution | `intent:{restaurantId}:{paymentIntentId}` |
| Sale overlap | `sale:{restaurantId}:{orderingChannel}:{orderId}` |
| Optional Check overlap | `checkref:{restaurantId}:{checkId}` |

Persist-time uniqueness remains `(restaurantId, idempotencyKey)` and `(restaurantId, paymentIntentId)`. `collectionFactId` is the fact primary id, not a second Gross key. Settlement Record ids are publication metadata. Split tenders share one contribution. Replayed events collapse on contribution id.

Production SR rows often lack `orderIds` / `orderingChannel`. Overlap then uses optional `checkId` on the fact. Isolated facts still cannot BOTH-suppress published Checks.

---

## 7. Published Collection Fact eligibility (explicit)

A Collection Fact may enter Published Revenue only if **all** hold:

1. purpose ∈ `PUBLISHED_COLLECTION_FACT_PURPOSES` (currently empty)
2. committed immutable fact (insert-only store)
3. valid restaurant, currency, amount, tax amount, business day, identity
4. no BOTH conflict with a paid Check for the same economic identity
5. refund treatment defined for that authority class (not true today → allowlist empty)

Shadow/test/validation/synthetic: **never** published.

---

## 8. Singular published pipeline

Before this program: Settlement Record aggregator → Published Revenue.

After cutover:

```
Settlement Record (legacy authority facts)
+ read-only Collection Facts
        ↓
Revenue Union (eligibility = published)
        ↓
Authority resolution
        ↓
Published Business Metrics DTO
```

Shadow dual-run remains: the previous aggregator is computed in-process for mismatch field names only. It is **not** a second published API. Rollback (`REPORTING_REVENUE_UNION=legacy`) is a publication-source switch, not dual-publish.

Payment method analytics, Order Sales, and SaaS `payments` stay outside restaurant Gross Revenue.

---

## 9. Business Day / tax

Trend still uses `resolveBusinessPeriodKey` + restaurant working hours on SR `settledAt`/`voidedAt` (canonical Reporting Business Day). Union does not introduce a second day boundary for published trend. Frozen `taxPolicySnapshot` / `currencySnapshot` on the authority row are copied, not recalculated from live settings.

Collection Fact frozen `businessDay` is used only if a fact becomes published-eligible (not in this program).

---

## 10. Schema

**No migration.** Existing `payment_collection_facts` + Settlement Records are sufficient for a read-side published Union with an empty production allowlist. SaaS/Tap `payments` remains unrelated.
