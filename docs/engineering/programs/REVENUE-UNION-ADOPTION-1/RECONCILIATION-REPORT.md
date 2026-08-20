# REVENUE-UNION-ADOPTION-1 — Reconciliation Report

**Status: VALIDATED (shadow dual-run) — published switch NOT ADOPTED**

## Rule

Do not switch published Revenue until Union Gross = expected Revenue on all dimensions. Any `BOTH` conflict is a STOP.

## Dual-run

```
Legacy Gross (SR paid gen=1)
        │
        ├──── compare ──── published Union (eligibility=none)
        │                      = legacy (facts ignored)
        │
        └──── compare ──── shadow Union (eligibility=isolated)
                             = legacy + non-overlapping isolated facts
```

With Production `payment_collection_facts` row count **0**:

| Metric | Legacy | Published Union (`none`) | Shadow Union (`isolated`) |
|---|---|---|---|
| Gross | SR paid sum | SR paid sum | SR paid sum |
| Collection Fact Gross | n/a | 0.00 | 0.00 |
| Net | Gross − refund SRs | same | same |

## Mismatch classes

| Class | Detection |
|---|---|
| Missing contribution | Union Gross &lt; expected source set |
| Duplicate | `DUPLICATE_*` or `BOTH` |
| Amount / tax / currency / business day | `compareFactToContribution` / `compareLegacyToUnion` |
| Refund | Net vs Gross − refund publications (legacy only) |

## Publication switch

**Not authorized.** Dashboard remains Settlement Record Gross / Net.
