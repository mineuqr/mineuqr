# Dashboard Scope Matrix

| Field | Value |
|-------|-------|
| **Program** | REPORTING-UX-CONSTITUTION-EXTENSION-3 |
| **Constitution** | KPI-10 · OBJ-04 · UX-06 |
| **Primary surface** | Restaurant `ReportsTab` four-area workspace |
| **Date** | 2026-07-27 |

## Nav area → allowed scopes

| Dashboard area | Nav id | Allowed Presentation Scopes | Forbidden |
|----------------|--------|-----------------------------|-----------|
| Executive Overview | `overview` | E (+ widgets with E) | O-only, F-only, D, I objects without E |
| Sales Analytics | `sales` | O (+ Class 1 with O; trends) | I; Class 4 without O; Exec-only objects not in O |
| Financial Analytics | `financial` | F · D (advanced nested) | I; Class 4 without D/F; Exec-only without F |
| Exports | `exports` | X (download actions) | I |

## Executive cards → scope check

| Card id | Requires Scope | Status |
|---------|----------------|--------|
| `revenue` | E | ✓ |
| `orderSales` | E | ✓ |
| `orderCount` | E | ✓ |
| `refundPublishedTotal` | E | ✓ |
| `taxCollected` | E | ✓ |
| `paymentOverview` | E (widget) | ✓ |

## Secondary Financial (Advanced) → scope check

| Typical cards | Requires Scope | Status |
|---------------|----------------|--------|
| Net Sales, Paid Checks | F · D | ✓ |
| Average Check/Order, Refund Rate, Comps | D | ✓ — **not** on Executive |

## Export surfaces

| Surface | Scope | Semantics rule |
|---------|-------|----------------|
| Excel workbook | X | Same Business Names / definitions as Dashboard |
| PDF | X | Same |
| CSV / scheduled / future BI | X | Same |

## Rule

Dashboard placement is illegal if the object’s Presentation Scope registry row does not include the area’s allowed scopes.
