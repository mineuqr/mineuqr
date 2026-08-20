# RECONCILIATION-REPORT

Program: `REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1`

Production Collection Fact row count: **0**. These proofs are **fixture /
unit** reconciliations. They do not write production financial data.

```
Legacy Gross     = Σ paid Settlement Record / Check grandTotal
Collection Fact Gross = Σ published production Collection Fact amount
Union Gross      = resolved published contributions
```

## Required matrices

| Fixture | Legacy Gross | CF Gross | Union Gross | Notes |
|---|---|---|---|---|
| Legacy only | 115.00 | 0 | **115.00** = Legacy | CASE 1 |
| CF only | 0 | 80.00 | **80.00** = CF | CASE 2 |
| Valid production overlap | 80.00 | 80.00 | **80.00** = CF; **≠** 160 | CASE 3 / 12 / 13 |
| Unrelated CF + Legacy (amount equal, different order) | 80.00 | 80.00 | **160.00** = Legacy + CF | CASE 6 / I-3 / I-4 |
| Isolated CF + Legacy | 115.00 | (rejected) | **115.00** = Legacy | CASE 9 |
| Invalid production CF + Legacy | 115.00 | (rejected) | **115.00** = Legacy | CASE 10 |
| checkId match, order mismatch | 80.00 | 80.00 | **160.00** | CASE 4 / I-5 — no heuristic |
| Same identity, different amount | 80.00 | 50.00 | **0** UNRESOLVED | CASE 7 — never merge |
| Duplicate production facts | 0 | 80+80 | **0** DUPLICATE | CASE 8 / I-9 |
| Overlap + refund 25 | Gross 100 / refund 25 | 100 | Gross **100**, Net **75** | CASE 11 |
| Multi-order mention | 160 | 80 | **0** UNRESOLVED | exclusive sale not proven |

## Dimensions

| Dimension | Overlap result |
|---|---|
| Gross | one contribution (CF) |
| Tax | CF tax only |
| Net | Gross − existing refund SR semantics |
| Paid count | 1 |
| Average check | Gross / 1 |
| Refunds | unchanged compensating SR publication |

Business Metrics summary for a matching-money overlap equals the previous SR
Gross **numerically** (80 = 80) while authority is Collection Fact. Dual-run
field mismatch count is therefore 0 for that fixture; observability still
records `productionOverlapResolved` and
`legacyExcludedBecauseProductionCollectionFactWon`.

Unrelated mixed identities: Union = Legacy + CF (no suppression).
