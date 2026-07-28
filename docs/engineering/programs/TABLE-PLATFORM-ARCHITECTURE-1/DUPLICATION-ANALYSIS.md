# Duplication Analysis — TABLE-PLATFORM-ARCHITECTURE-1

## Presentation duplication

### 1. Admin opsTable five-pack (HIGH)

Five screens re-implement:

- `<table className={adminDash.opsTable}>`
- `opsTableWrap` desktop gate
- Mobile `lg:hidden` list/cards
- Truncate / actions cell classes
- Empty/loading via Admin* helpers

**Duplicated presentation:** table chrome, responsive split, row density.  
**Not duplicated:** row data mapping (feature-owned) — correctly separate.

**Debt:** Any density/a11y change requires 5 edits.

### 2. Reporting ledger trio (MEDIUM–HIGH)

SettlementHistory / PaymentMethodAnalysis / RefundAnalytics share:

- `overflow-x-auto` + `min-w-[480–640px]`
- Slate thead/tbody recipe
- No shared component; copy-paste structure

Settlement adds pagination/filters; analytics tables are static breakdowns — same shell, different behavior.

### 3. Ad-hoc Card HTML quartet (MEDIUM)

PaymentHistory, StatisticsPanel, VisibilityDiagnostics, GateTable:

- Independent HTML tables inside Cards
- Inconsistent status chips (local spans vs Badge)
- No shared empty/loading contract
- Statistics conceptually overlaps CS Accounts data presentation

### 4. Orphan primitives (MEDIUM)

`ui/table.tsx` and `ui/pagination.tsx` exist but are unused — parallel “future” stack never adopted while custom HTML proliferated.

### 5. CSS-grid “tables” (LOW duplication between them)

Fleet and WorkingHours both use CSS-grid rows but different domains/interactions — **not** forks of each other. Fleet should remain specialized; WorkingHours is a form matrix.

---

## Logic duplication (presentation-adjacent)

| Concern | Duplicated? | Notes |
| --- | --- | --- |
| Column definition objects | Partially | Inline JSX columns everywhere; no column registry |
| Filter state + search bars | Yes (Accounts/Tenants/Fleet/Settlement) | Different shapes; similar UX |
| Load-more footer | Yes (3 security tables) | Shared `AuditEventListFooter` — good partial SSOT |
| Pagination controls | Settlement only | Unique pageSize UI |
| Sort controls | Fleet only | Server-driven |
| Selection / bulk | No (absent) | Opportunity if product needs it later |

---

## Duplicated status presentation inside tables

| Pattern | Locations |
| --- | --- |
| SemanticBadge | Accounts (subscription), Fleet |
| shadcn Badge | Tenants, Statistics, commercial diagnostics |
| Local color spans | PaymentHistory `getStatusColor` |
| Local severity class | Security audit |
| Text label only | Settlement history |

Violates Semantic Badge System governance for table status cells.
