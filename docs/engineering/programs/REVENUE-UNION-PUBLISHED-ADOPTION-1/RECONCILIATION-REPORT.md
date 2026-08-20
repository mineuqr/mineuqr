# REVENUE-UNION-PUBLISHED-ADOPTION-1 — Reconciliation Report

**Status: VALIDATED for the empty Collection Fact window — no unexplained Gross/Net delta expected**

Production Collection Fact row count at program start: **0**.
Published eligibility allowlist: **empty**.

Therefore:

```
Published Union Gross = Legacy Settlement Record Gross
Published Union Net   = Legacy Net (Gross − refund SRs)
Published tax         = Legacy tax snapshots
Published complimentary / void counts = Legacy
```

## Required dimensions

| Dimension | Empty-CF result |
|---|---|
| 1. Total gross | Equal (unit: `230.00` / `115.00` / `42.00` fixtures; service tests) |
| 2. Total net | Equal (refund fixtures `200−50`, `90−20`) |
| 3. Tax | Equal (copied `taxAmount`) |
| 4. Refunds | Equal (legacy SR compensating docs only) |
| 5. Complimentary | Counted, not Gross |
| 6. Void | Counted, not Gross |
| 7–8. Business day / timezone | Trend unchanged (`resolveBusinessPeriodKey`) |
| 9. Restaurant | Tenant-scoped SR + CF reads |
| 10. Transaction count | `paidCheckCount` = paid contribution count; CF addend 0 |
| 11. Authority count | All published contributions `LEGACY_CHECK` |
| 12. Duplicate/conflict count | 0 in empty-CF production; isolated overlap does not BOTH on published path |

## Dual-run (validation, not a second write)

In published mode, `getBusinessMetricsSummary` still builds the previous aggregator in-process and records **mismatch field names** (not amounts) when they differ. With eligibility `published` and 0 eligible facts, mismatch field count must be 0. Isolated facts in the table increment `eligibilityRejectedFactCount` only.

Shadow eligibility `isolated` may differ from published when isolated rows exist. That difference is **expected** and must not be published.

## Unexplained difference policy

Any published vs legacy aggregator mismatch with empty allowlist is a defect. Do not certify around it. Rollback: `REPORTING_REVENUE_UNION=legacy`.
