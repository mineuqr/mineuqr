# Inventory Report — TABLE-PLATFORM-ARCHITECTURE-1

**Scope:** `client/src` tabular data UIs  
**Excluded as non-tables:** dining-table boards (`ActiveTablesBoardSection`, `ActiveSessionsTableSection` cards), waiter floor stages, Excel export “tables”

---

## Shared primitives (orphan / partial)

| Asset | Path | Adoption |
| --- | --- | --- |
| shadcn Table | `components/ui/table.tsx` | **0 consumers** |
| shadcn Pagination | `components/ui/pagination.tsx` | **Unused by tables** |
| Admin ops tokens | `adminDashStyles.opsTable*` | Used by 5 admin screens |
| ResponsiveOperationsBar | `admin/operations/ResponsiveOperationsBar.tsx` | CS Accounts + Tenants toolbars |
| AuditEventListFooter | security | Load-more for 3 security tables |
| VirtualizedFleetTable | screen-management | Fleet only |

---

## Full inventory (14 distinct UIs)

### Cluster A — Admin `opsTable` (5)

| # | Component | Path | Owner | Purpose | Render | Pag | Sort | Filter | Select/Bulk | Empty/Load/Error | Status | Actions | Responsive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | CustomerSuccessAccountsSection | `admin/domains/customer-success/CustomerSuccessAccountsSection.tsx` | Admin CS | Account directory | Raw HTML + mobile cards | No | No | Yes | No | AdminLoading/Empty | SemanticBadge + Badge | Yes | Table≥lg / cards&lt;lg |
| 2 | CustomerSuccessTenantsSection | `.../CustomerSuccessTenantsSection.tsx` | Admin CS | Tenant directory | Raw HTML + mobile list | No | No | Yes | No | AdminLoading/Empty | Badge | Yes | Same |
| 3 | SecurityAuditTimelineSection | `admin/domains/security/SecurityAuditTimelineSection.tsx` | Security | Audit timeline | Raw HTML + mobile list | Load-more | No | Minimal | No | Security* + Empty | Local severity pill | Row click | Same |
| 4 | SecurityRoleChangesSection | `.../SecurityRoleChangesSection.tsx` | Security | Role-change audit | Raw HTML + mobile list | Load-more | No | Fixed filter | No | Same | Text | No | Same |
| 5 | SecuritySubscriptionChangesSection | `.../SecuritySubscriptionChangesSection.tsx` | Security | Sub-change audit | Raw HTML + mobile list | Load-more | No | Category | No | Same | Text | No | Same |

**Data sources:** tRPC admin/security queries (feature-owned).  
**Toolbar:** ResponsiveOperationsBar (Accounts/Tenants); security sections use section chrome.

### Cluster B — Reporting / settlement ledgers (3)

| # | Component | Path | Owner | Purpose | Render | Pag | Sort | Filter | Status | Actions | Responsive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | SettlementHistoryPanel | `settlement-record/SettlementHistoryPanel.tsx` | Settlement | Document history | Raw HTML | Yes (20) | No | Yes (search/date/status/source) | Text labels | Receipt/view | H-scroll |
| 7 | PaymentMethodAnalysisSection | `dashboard/PaymentMethodAnalysisSection.tsx` | Reporting | Method mix | Raw HTML | No | No | Parent period | None | No | H-scroll |
| 8 | RefundAnalyticsSection | `dashboard/RefundAnalyticsSection.tsx` | Reporting | Refund mix | Raw HTML | No | No | Parent period | None | No | H-scroll |

**Data sources:** reporting/settlement DTOs (canonical platforms).  
**Empty/loading:** RestaurantSection* / SemanticKpiSkeleton / inline (Settlement).

### Cluster C — Ad-hoc commercial / billing (4)

| # | Component | Path | Owner | Purpose | Render | Pag | Filter | Status | Actions | Responsive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 9 | PaymentHistory | `pages/PaymentHistory.tsx` | Billing | Invoice history | Raw HTML in Card | No | No | Local color spans | View/download | H-scroll |
| 10 | StatisticsPanel | `pages/admin/StatisticsPanel.tsx` | Admin commercial | Owner subscription overview | Raw HTML | No | No | Badge | No | H-scroll |
| 11 | CommercialVisibilityDiagnostics | `commercial/CommercialVisibilityDiagnostics.tsx` | Commercial diag | Feature visibility | Raw HTML | No | No | Badge | No | H-scroll |
| 12 | GateTable (×3 instances) | `commercial/CommercialGateConsolidationDiagnostics.tsx` | Commercial diag | Gate migration status | Raw HTML helper | No | No | Badge | No | H-scroll |

### Cluster D — CSS-grid tabular (2)

| # | Component | Path | Owner | Purpose | Render | Pag | Sort | Filter | Status | Actions | Responsive |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | VirtualizedFleetTable + FleetScreenTableRow | `screen-management/*` | Fleet | Screen directory | CSS-grid + custom virtualization | Cursor load-more | Server sortBy | Yes | SemanticBadge (pill) | Yes | H-scroll + card mode |
| 14 | WorkingHoursEditor | `RestaurantSettingsSections.tsx` | Settings | Editable hours matrix | CSS-grid | No | No | No | Open/Closed text | Inline editors | Grid≥md / stack&lt;md |

---

## Domains with no HTML data tables (cards / lists instead)

Orders workspace, Kitchen, Register ops, Sessions boards, Notifications — list/card UIs, not tabular grids.

---

## Counts

| Metric | Value |
| --- | ---: |
| Distinct table UIs | **14** |
| Raw HTML `<table>` | 12 |
| CSS-grid tables | 2 |
| TanStack / DataTable layers | **0** |
| `ui/table` consumers | **0** |
| Tables with row selection | **0** |
| Tables with SemanticBadge status | 2 (Accounts, Fleet) |
