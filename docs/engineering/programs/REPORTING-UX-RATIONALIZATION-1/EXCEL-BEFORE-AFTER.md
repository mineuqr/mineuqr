# Excel Before / After Summary

| Area | Before | After |
|------|--------|-------|
| Period bounds | Business Day month/year windows | Pure Gregorian month/year (restaurant TZ wall) |
| Executive Summary | Operational Order Sales trio only | **Exec V2** — Gross Sales, Net Sales, Refund Amount, Refund Rate, Tax Collected, Orders, Average Order, Average Check |
| Sheet: Payment | “Payment Method Analysis” | “Payment Analytics” |
| Sheet: Trends | “Check Revenue Trends” | “Sales Trends” |
| Financial labels | Check Revenue / Refund Publications / Net Revenue | Gross Sales / Refund Amount / Net Sales (via Product Semantics) |
| KPI formulas | Unchanged | Unchanged |
| DTO source | `reporting.*` | `reporting.*` (same) |
| Dashboard parity | Overview lifetime ≠ Excel period | Same period selector drives both |
