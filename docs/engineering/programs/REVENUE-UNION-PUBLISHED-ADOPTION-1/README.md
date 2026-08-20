# REVENUE-UNION-PUBLISHED-ADOPTION-1

**IMPLEMENTED** — published Business Metrics resolve through Revenue Union
**VALIDATED** — unit + architecture guards
**ADOPTED** — singular published Revenue pipeline is Union authority resolution
**PUBLISHED** — Dashboard / KPI / Excel / trend consume that pipeline

**Collection Fact contribution: NOT ADOPTED**

This is **not** `PASS — REVENUE UNION PUBLISHED ADOPTION CERTIFIED` for Collection Fact money. Persistable `production` purpose does not exist (0096 enum), and Collection Fact-native refund / void / complimentary kinds do not exist. Published eligibility is therefore an empty purpose allowlist. Isolated `synthetic|shadow|test|validation` facts never enter Published Revenue.

Cashier, Confirm, PAID, Check lifecycle, and Settlement writers are unchanged.

## Status terms (do not interchange)

| Term | Meaning in this program |
|---|---|
| IMPLEMENTED | Code exists for published Union resolution and rollback |
| VALIDATED | Tests prove empty-CF equivalence, conflict, duplicate, eligibility, classifier |
| ADOPTED | `getBusinessMetricsSummary` / `getBusinessMetricsTrend` call Union (not a second Gross root) |
| PUBLISHED | Clients receive Union-resolved Business Metrics DTOs |
| NOT ADOPTED (CF contribution) | No Collection Fact amount can enter Published Gross/Net yet |

## Published formula (current production-safe eligibility)

```
Published Gross
  = Σ paid LEGACY_CHECK grandTotal   (non-conflict, unique check id)
  + Σ published-eligible COLLECTION_FACT amount
      (allowlist empty → 0)

Published Net = Published Gross − Σ legacy refund SR publications
```

With production Collection Fact row count = 0, Published Union = legacy Settlement Record Revenue.

## Authority

| Class | Published behavior |
|---|---|
| LEGACY_CHECK | Publish Check/SR contribution |
| COLLECTION_FACT | Publish fact contribution (none today) |
| BOTH | Publish neither; operational signal |
| UNRESOLVED | Publish neither; operational signal |

Isolated facts are **eligibility-rejected**, not BOTH. They must not zero-out legitimate Check Revenue.

## Rollback

`REPORTING_REVENUE_UNION=legacy` restores the previous SR aggregator path. This does **not** delete Collection Facts or rewrite history.

## Documents

- [ARCHITECTURE-DECISION-REPORT.md](./ARCHITECTURE-DECISION-REPORT.md)
- [IMPLEMENTATION-REPORT.md](./IMPLEMENTATION-REPORT.md)
- [VALIDATION-REPORT.md](./VALIDATION-REPORT.md)
- [RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md)
- [CUTOVER-REPORT.md](./CUTOVER-REPORT.md)
