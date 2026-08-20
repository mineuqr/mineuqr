# REVENUE-UNION-ADOPTION-1 — Architecture Decision Report

**Decision: APPROVED WITH DOCUMENTED GAPS**
**Publication: NOT ADOPTED**

Authority: [ADR-ARCH-039](../../../architecture/adrs/ADR-ARCH-039-payment-collection-financial-authority.md) I-REV-U-01 / I-REV-U-02.

---

## 1. Legacy Revenue (GATE 1)

**Published SSOT today:** Settlement Record gen=1 `settlement`/`void` publications (`REPORTING_FINANCIAL_SOURCE` default `settlement_record`). Check table remains emergency/`dual` parity only.

| Concern | Behavior |
|---|---|
| Gross Revenue | SUM paid `grandTotal` |
| Tax | SUM paid `taxAmount` (copied, not recalculated) |
| Complimentary | Counted, **not** Gross |
| Void | Counted, **not** Gross |
| Refund | Compensating SR `recordKind=refund`; Net = Gross − refund publications |
| Business Day / TZ | `settledAt`/`voidedAt` + restaurant working hours via `resolveBusinessPeriodKey` (`APP_TIMEZONE` / reporting TZ) |
| KPI / Excel / Dashboard | Consume Business Metrics DTOs; presentation must not recalculate |

Order Sales is a different concept (Order Read) and is not Revenue.

---

## 2. Collection Fact Revenue (GATE 2)

Authoritative for Union **when eligible**: `amount`, `taxAmount`, `currencyCode`/`currencySnapshot`, frozen `businessDay`, `restaurantId`, `orderId`, `orderingChannel`, `paymentIntentId`.

Tenders are historical tender truth; Gross uses `amount` (already reconciled to tenders at commit). Composition is not a second Gross.

**Gaps (implementation stopped at these boundaries — not silently filled):**

1. **No production purpose.** Persistable purposes are `synthetic|shadow|test|validation`. Published eligibility is therefore `none`.
2. **No compensating Collection Fact kinds** (`refund`/`void`/`complimentary`). Union refunds/voids/complimentary remain **legacy SR/Check only**.
3. **CheckReportingRow has no orderIds** in production reads. Overlap uses optional `orderIds`/`orderingChannel` plus `checkId` when present on the fact.

---

## 3. Authority selection (GATE 3–5)

Deterministic classes: `LEGACY_CHECK` or `COLLECTION_FACT`.

Published contribution cannot be `UNKNOWN` or `BOTH`. `BOTH` → conflict, exclude both sides.

Idempotency: duplicate Check id or duplicate `paymentIntentId` collapses to one contribution.

---

## 4. Dual-run vs dual-write

Dual-run: compare legacy Gross to Union Gross. Allowed.

Dual-write: paid Check + Collection Fact for one collection. Forbidden. Resolver rejects both from Gross.

---

## 5. Historical data

Historical paid Checks remain `LEGACY_CHECK`. No backfill of Collection Facts.

---

## 6. Split / multi-check

Unchanged economics: one paid Check = one contribution; one Collection Fact (all tenders) = one contribution; two paid Checks = two contributions.

---

## 7. Schema

**No migration.** Existing `payment_collection_facts` + Settlement Records are sufficient for a read-side Union.
