# REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1 — Architecture Decision Report

**Decision: IMPLEMENT UNION AUTHORITY RESOLUTION ONLY**
**Cashier: NOT ADOPTED**
**Confirm / PAID: UNCHANGED**
**Collection Fact writer: UNCHANGED**
**Migration: 0097 (no 0098)**
**Deployment: NOT DEPLOYED**

---

## 1. Why this program exists

`PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1` discovered that live Revenue
Union plus Cashier Check PAID plus a production Collection Fact cannot score
correctly under the previous overlap rule:

| Situation | Old Union behavior | Result |
|---|---|---|
| CF **with** `checkId` matching the paid Check | generic **BOTH → publish neither** | Cashier revenue **disappears** |
| CF **without** `checkId`, live SR adapter dropped `orderRefs` | no overlap proof → both published | **double-count** |

This program does **not** retry Cashier adoption. It only establishes the
Union authority boundary required before any later Cashier attempt.

---

## 2. What BOTH used to mean (and still means, when scoped)

The generic **BOTH** class remains:

> the same transaction has a paid Check and an eligible Collection Fact, and
> the Union will not silently pick one → **publish neither**.

That is still correct for **isolated dual-run** (`eligibility: "isolated"`)
and for any pairing that is **not** a proven published production overlap.

BOTH must **not** globally become “Collection Fact wins.” Isolated facts must
never suppress published legacy Gross.

---

## 3. Target architecture

When a **valid published production** Collection Fact and a paid Check /
Settlement Record represent the **same economic sale**:

| Side | Authority |
|---|---|
| Production Collection Fact | published financial authority |
| Legacy Check / Settlement Record | excluded from Revenue Union Gross |
| Result | exactly one economic contribution |

Classifier class: **PRODUCTION_OVERLAP**.
Published contribution authority: **COLLECTION_FACT** (not a second Gross root).

---

## 4. Canonical economic overlap identity

Do **not** use `checkId` as the sole economic identity.

Do **not** assume `CollectionFact.checkId == SettlementRecord.checkId` is
sufficient.

| Role | Identity |
|---|---|
| Tenant | `restaurantId` |
| Economic sale | `restaurantId + orderingChannel + orderId` |
| Payment | `paymentIntentId` |
| Retry | `idempotencyKey` |
| Durable fact | `collectionFactId` |
| Legacy contribution | `check:{restaurantId}:{checkId}` |
| Terminal / actor / businessDay | attribution / snapshot — not identity |

**Proven overlap** (safe CF-win):

1. Same `restaurantId`.
2. Settlement Record `orderRefs` / `orderIds` is **exactly** `[fact.orderId]`
   (singleton exclusive membership).
3. If the legacy snapshot has a non-empty `orderingChannel`, it must match
   the fact.
4. Amount and currency agree (reconciliation evidence, not identity).

**Not identity (never sufficient alone):** amount, timestamp, `checkId`,
terminal, cashier, businessDay.

**Unsafe collision** (order mentioned but exclusive sale not proven —
multi-order Check or channel mismatch): **UNRESOLVED**. Publish neither.
Do not CF-win. Do not publish both.

**Empty `orderIds`:** cannot prove overlap. `checkId` is **not** used as a
fallback. Independent publication is allowed only when there is no order
mention. This is the remaining snapshot-quality gap; it is not solved with a
heuristic.

Settlement Record `orderRefs` store `{ orderId }` only. Live reporting now
projects those refs into Union `orderIds`. Channel is enforced only when the
legacy Union fact actually has one.

---

## 5. Authority classes

| Class | Meaning | Published Gross |
|---|---|---|
| LEGACY_CHECK | paid Check/SR, no eligible production overlap | legacy |
| COLLECTION_FACT | valid published production fact, no legacy overlap | Collection Fact |
| PRODUCTION_OVERLAP | proven same economic sale | Collection Fact only; legacy Gross excluded |
| UNRESOLVED | cannot safely choose | neither |
| DUPLICATE | more than one production fact claims the same sale / intent | neither (facts collapsed) |
| BOTH | isolated dual-run or unpaired eligible fact+Check without production-overlap proof | neither |

DUPLICATE is a conflict class (`DUPLICATE_FACT`). It is not a published
contribution authority.

---

## 6. What this program explicitly does not do

- Cashier connection, Confirm / PAID changes, `paymentIntentId` on Cashier
- Collection Fact INSERT / UPDATE / DELETE
- Payment aggregate / `payments` table / migration 0098
- Check / Settlement / ST / OS / SR writer changes
- Refund / void / complimentary Collection Fact kinds
- Historical rewrite of Settlement Records
- A second Revenue API or dashboard

If any of those appear necessary for a later Cashier cutover, that is a
**separate architectural program**.

---

## 7. Refund / void / complimentary

Refunds remain compensating Settlement Records. PRODUCTION_OVERLAP excludes
legacy **Gross** but **keeps** refund publications for that Check.

Void and complimentary remain legacy outcomes, not Collection Fact kinds.

If refunds ever require a Collection Fact kind, STOP. Not this program.

---

## 8. Business Metrics

`getBusinessMetricsSummary` and `getBusinessMetricsTrend` continue to consume
one published Union path (`eligibility: "published"`).

Trend mapping retains overlapping SR rows (money already proven compatible)
so Gross and refunds do not disappear, and appends Collection Fact-only rows
that have no Settlement Record.

This is a Union projection onto the existing trend aggregator — not a second
financial authority.
