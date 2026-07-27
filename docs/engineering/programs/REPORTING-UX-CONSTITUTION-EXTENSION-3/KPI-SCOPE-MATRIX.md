# KPI Scope Matrix

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 |
| **Date** | 2026-07-27 |

Columns: E Executive · O Operational · F Financial · D Diagnostic · X Export · I Internal  
`✓` = approved · blank = **forbidden**

| KPI id | Business Name | Class | E | O | F | D | X | I |
|--------|---------------|-------|---|---|---|---|---|---|
| `revenue` | Total Sales | 1 | ✓ | | ✓ | | ✓ | |
| `orderSales` | Sales Orders | 1 | ✓ | ✓ | | | ✓ | |
| `orderCount` | Orders | 1 | ✓ | ✓ | | | ✓ | |
| `refundPublishedTotal` | Refund Amount | 1 | ✓ | | ✓ | | ✓ | |
| `taxCollected` | Tax Collected | 1 | ✓ | | ✓ | | ✓ | |
| `completedOrders` | Completed Orders | 2 | | ✓ | | | ✓ | |
| `pendingOrders` | Pending Orders | 2 | | ✓ | | | | ✓* |
| `activeOrders` | Active Orders | 2 | | ✓ | | | | ✓* |
| `kitchenLoad` | Kitchen Load | 2 | | ✓ | | | | ✓* |
| `activeSessions` | Active Sessions | 2 | | ✓ | | | | ✓* |
| `occupiedTables` | Occupied Tables | 2 | | ✓ | | | | ✓* |
| `netRevenue` | Net Sales | 3 | | | ✓ | ✓ | ✓ | |
| `paidCheckCount` | Paid Checks | 3 | | | ✓ | ✓ | ✓ | |
| `dailySales` | Daily Total Sales | 3 | | | ✓ | | ✓ | |
| `refundPublicationCount` | Refund Count | 3 | | | ✓ | ✓ | ✓ | |
| `averageCheck` | Average Check | 4 | | | | ✓ | ✓ | |
| `averageOrder` | Average Order | 4 | | | | ✓ | ✓ | |
| `refundRate` | Refund Rate | 4 | | | | ✓ | ✓ | |
| `complimentaryCount` | Complimentary Count | 4 | | | | ✓ | ✓ | |
| `complimentaryAmount` | Complimentary Amount | 4 | | | | ✓ | ✓ | |
| `voidedCount` | Voided Count | 4 | | ✓ | | ✓ | ✓ | |
| `topSellingItems` | Top Selling Items | 4 | | ✓ | | ✓ | ✓ | |
| `catalogCategoryCount` | Catalog Categories | 4 | | | | ✓ | ✓ | |
| `catalogItemCount` | Catalog Items | 4 | | | | ✓ | ✓ | |
| `menuVisits` | Menu Visits | 4 | | | | ✓ | ✓ | |

\*Internal scope only when surfaced in platform/support tools — not restaurant Executive/Financial product UI.

## Hard forbids

- Class 4 → column **E** blank by default (KPI-08 / KPI-09 / KPI-10).  
- No product KPI may mark **I** as its only customer path.  
- Adding ✓ under **E** requires KPI-09 promotion + Class 1 + registry update.
