# AUTHORITY-RESOLUTION-SPECIFICATION

Program: `REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1`

Engine: `shared/reporting-platform/revenue-union/`
Live identity projection: Settlement Record `orderRefs` → Union `orderIds`

---

## 1. Inputs

- Legacy paid / complimentary / void Settlement Record (or Check emergency) facts
- Collection Facts (read-only)
- Refund Settlement Records (compensating publications)

Union computation is **side-effect free**. It does not insert, update, or
delete Collection Facts.

---

## 2. Eligibility

Published eligibility accepts **production** purpose only.

Isolated purposes (`synthetic`, `shadow`, `test`, `validation`) never become
published authority. They cannot suppress published legacy Gross.

A production fact must also pass `isValidCollectionFactAuthority`
(tenant, orderId, paymentIntentId, collectionFactId, channel, currency,
businessDay, non-negative money). Invalid production facts are UNRESOLVED and
cannot supersede valid legacy Gross.

---

## 3. Overlap algorithm

For each unique legacy contribution:

1. If duplicate production facts already collapsed on the same sale and they
   collide with this legacy sale → **UNRESOLVED** (exclude legacy; facts
   already excluded).
2. If a remaining fact **mentions** this Check’s order but exclusive sale is
   not proven → **UNRESOLVED** (exclude both).
3. If exclusive sale is proven and eligibility is published production:
   - money disagrees → **UNRESOLVED** (exclude both; never silent merge)
   - money agrees → **PRODUCTION_OVERLAP** (exclude legacy Gross; keep fact)
4. Else if an eligible fact is paired without production-overlap proof
   (isolated dual-run) → **BOTH** (exclude both).
5. Else publish remaining non-excluded legacy and fact contributions.

`checkId` is never used for pairing.

---

## 4. Published formula

```
Published Gross
  = Σ paid LEGACY_CHECK grandTotal   (not excluded)
  + Σ published COLLECTION_FACT amount (not excluded)

PRODUCTION_OVERLAP:
  legacy Gross addend = 0
  Collection Fact addend = fact.amount

Published Tax = corresponding tax on the same published contributions
Published Net = Published Gross − Σ refund SR publications
  (refunds are NOT skipped solely because Gross overlap excluded the Check)
Paid count / average check count the published contributions once
```

Do not solve overlap by subtracting arbitrary amounts. Exclusion is
structural (`excludedLegacyIds` + `productionOverlapExcludedLegacyIds`).

---

## 5. Observability (counts only)

`reporting_revenue_union_publication` metadata:

- `productionOverlapResolved`
- `unresolvedProductionOverlap`
- `duplicateProductionCollectionFact`
- `invalidProductionCollectionFact`
- `legacyExcludedBecauseProductionCollectionFactWon`

No tender payloads. No full financial snapshots.

---

## 6. Determinism

Same inputs → same authority result (I-10).
No Union writes (I-11, I-12).
