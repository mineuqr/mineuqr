# Number Formatting Guidelines

| Field | Value |
|-------|-------|
| **Program** | REPORTING-VISUAL-HIERARCHY-1 |
| **Date** | 2026-07-27 |

| Kind | Guideline | Implementation |
|------|-----------|----------------|
| Currency | 2 decimal places, thousands separators, Western digits | `formatMoneyDisplay` / `formatSettlementRevenue` |
| Counts | Integer, thousands separators | `formatNullableCount` (en-US + Western digits) |
| Percentages | 2 decimals + `%` as already on DTO display | Unchanged semantics |
| Avoid | Extra precision beyond executive need | No 4+ decimal money displays |

Formatting is presentation-only; DTO string values unchanged.
