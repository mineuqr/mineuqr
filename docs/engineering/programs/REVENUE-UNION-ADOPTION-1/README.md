# REVENUE-UNION-ADOPTION-1

**IMPLEMENTED** (shadow Union compute)
**VALIDATED** (unit + architecture guards)
**NOT ADOPTED** (published Dashboard/reporting still Settlement Record)

This program makes Revenue *capable* of recognizing Collection Fact authority beside legacy Check/SR authority. It does **not** migrate Cashier, write Collection Facts, change PAID, or switch published Revenue.

## Formula (migration period)

```
Gross Union =
  Σ paid LEGACY_CHECK grandTotal   (non-conflict)
+ Σ eligible COLLECTION_FACT amount (non-conflict)

Net Union = Gross Union − Σ legacy refund publications
```

Eligibility for Collection Facts:

- **Published / production-safe:** `none` — facts never contribute (required while purpose cannot be production).
- **Shadow / validation:** `isolated` — `synthetic|shadow|test|validation` facts may contribute in tests only.

I-REV-U-01: if the same transaction has a paid Check **and** a Collection Fact, **neither** is published (`BOTH` conflict).

## Identity

| Authority | Contribution id |
|---|---|
| LEGACY_CHECK | `check:{restaurantId}:{checkId}` |
| COLLECTION_FACT | `intent:{restaurantId}:{paymentIntentId}` |
| Overlap | `sale:{restaurantId}:{orderingChannel}:{orderId}` and optional `checkId` |

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
