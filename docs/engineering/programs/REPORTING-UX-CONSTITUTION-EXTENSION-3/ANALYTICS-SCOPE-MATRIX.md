# Analytics Scope Matrix

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 · OBJ-03 |
| **Date** | 2026-07-27 |

Analytics modules group KPIs; they do not own them. Each module has an allowed Presentation Scope footprint.

| Analytics id | Business name | Primary scopes | May host KPI classes | Customer-facing? |
|--------------|---------------|----------------|----------------------|------------------|
| `executive-overview` | Executive Overview | E · X | Class 1 (+ governed widgets) | Yes |
| `sales-analytics` | Sales Analytics | O · X | Class 1 (Sales Orders/Orders) · Class 2 · some Class 4 | Yes |
| `financial-analytics` | Financial Analytics | F · D · X | Class 1 (financial) · Class 3 · Class 4 | Yes |
| `refund-analytics` | Refund Analytics | F · D · X | Class 1 Refund · Class 3/4 refund diagnostics | Yes |
| `payment-analytics` | Payment Analytics | F · X | Widgets + settlement payment publications | Yes |
| `exports` | Exports | X | Any customer KPI already in Scope X | Yes |
| Platform monitoring analytics | (internal) | I | Class 5 only | **No** |

## Rules

- An Analytics module MUST NOT host a KPI whose Presentation Scope excludes that module’s scopes.  
- Example: `averageOrder` (D·X only) MUST NOT appear in `executive-overview`.  
- Example: `revenue` (E·F·X) MAY appear in Executive and Financial Analytics and Exports.
