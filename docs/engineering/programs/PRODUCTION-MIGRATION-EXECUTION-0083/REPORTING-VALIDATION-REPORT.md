# PRODUCTION-MIGRATION-EXECUTION-0083 — Reporting Validation Report

| Surface | Result |
|---------|--------|
| Schema dependency for Sales Channel Analytics | **Met** — `order_read_orders.ordering_channel` present |
| Settlement / revenue tables | Untouched by 0083 |
| Payment / refund tables | Untouched |
| Reporting APIs code | Untouched |
| Live dashboard UAT | Not re-run against production UI in this program |

### Expected reporting behavior post-migrate

- Served orders with stamps → Sales Channel Analytics buckets
- Historical null stamps → `unassigned` (no identityScope inference)
- Total Sales / Payment Method Analytics unchanged (different planes)
