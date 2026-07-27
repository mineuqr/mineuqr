# Widget Scope Matrix

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 · OBJ-02 |
| **Date** | 2026-07-27 |

Widgets are **not** KPIs. They still require Presentation Scope.

| Widget id | Business label | E | O | F | D | X | I | Notes |
|-----------|----------------|---|---|---|---|---|---|-------|
| `executive-kpi-grid` | Executive KPI grid | ✓ | | | | ✓ | | Hosts Class 1 cards |
| `payment-overview` | Payment Overview | ✓ | | ✓ | | ✓ | | Not a `KpiId` |
| `sales-orders-today-card` | Today's Sales Orders | | ✓ | | | ✓ | | |
| `completed-orders-period-card` | Completed Orders | | ✓ | | | ✓ | | |
| `order-sales-period-detail` | Sales Orders period detail | | ✓ | | | ✓ | | |
| `settlement-trends` | Sales / settlement trends | | ✓ | ✓ | | ✓ | | Trends may span O/F sheets |
| `settlement-overview` | Financial performance overview | | | ✓ | | ✓ | | |
| `refund-analytics` | Refund Analytics widgets | | | ✓ | ✓ | ✓ | | |
| `payment-method-analysis` | Payment Analytics widgets | | | ✓ | | ✓ | | |
| `advanced-financial` | Advanced Financial | | | | ✓ | ✓ | | Averages, rates, comps |

## Rules

- Widget MUST NOT render a KPI outside that KPI’s approved scopes.  
- Moving a Widget into **E** requires Executive protection gates (KPI-09 analogue for widgets).  
- Export widgets/sheets inherit Scope **X** and must preserve semantics (KPI-05).
