# REPORTING-SALES-CHANNEL-ANALYTICS-1 — Regression Report

| Area | Expectation | Status |
|------|-------------|--------|
| BusinessMetricsSummary / Total Sales | Unchanged formulas | Protected — no edits |
| PaymentMethodAnalytics | Unchanged | Protected — no edits |
| Refund / Tax reporting | Unchanged | Protected — no edits |
| Settlement / Revenue / Ownership laws | Untouched | Protected |
| ADR / Constitutions / Governance | Untouched | Protected |
| Sales Source UI | Now binds live DTO (was `facts={null}`) | Intentional product unlock |
| HOTFIX-1 null-facts lock | Superseded by this program | Guards updated |
| Place order APIs | Additive `orderingChannel` stamp | Backward compatible (nullable column) |
| Pre-stamp historical orders | Legacy identityScope fallback | Observation — QR vs table ambiguity for unstamped TABLE history |

## Rollback

1. Stop calling `getSalesChannelAnalytics` in UI (revert section to empty/unavailable)
2. Column may remain nullable — no financial law rollback required
