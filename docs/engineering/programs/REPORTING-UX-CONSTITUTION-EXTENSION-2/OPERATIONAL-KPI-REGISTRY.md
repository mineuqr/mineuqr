# Operational KPI Registry (Class 2)

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-2 |
| **Constitution** | KPI-08 Class 2 |
| **Date** | 2026-07-27 |

Operational KPIs belong in operational / Sales operational reporting — **not** Executive Overview by default.

| KPI id | Business Name | Audience | Canonical path (summary) | Default placement |
|--------|---------------|----------|--------------------------|-------------------|
| `completedOrders` | Completed Orders | Ops / Managers | Order Read analytics | Sales Analytics |
| `pendingOrders` | Pending Orders | Ops / Kitchen / Floor | Operational order projections | Operational views |
| `activeOrders` | Active Orders | Ops / Kitchen | Operational order projections | Operational views |
| `kitchenLoad` | Kitchen Load | Kitchen / Ops | Kitchen / order load projection | Operational views |
| `activeSessions` | Active Sessions | Ops / Floor | Session operational signals | Operational views |
| `occupiedTables` | Occupied Tables | Floor / Ops | Table occupancy signals | Operational views |

## Mission examples not yet separate dictionary KPIs

| Example name | Status |
|--------------|--------|
| Preparing Orders | Not a distinct `KpiId` in current dictionary — treat as future Class 2 candidate if elevated |
| Ready Orders | Not a distinct `KpiId` in current dictionary — treat as future Class 2 candidate if elevated |

New Class 2 KPIs require dictionary entry + classification + lifecycle before certification. Executive placement requires KPI-09 promotion.
