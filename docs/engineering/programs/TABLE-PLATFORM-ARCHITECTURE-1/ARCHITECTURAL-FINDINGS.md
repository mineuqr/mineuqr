# Architectural Findings — TABLE-PLATFORM-ARCHITECTURE-1

## Current architecture state

```
Feature screens
  └─ Inline <table> / CSS-grid rows
       ├─ adminDash.opsTable* tokens (admin only)
       ├─ ad-hoc Tailwind (reporting / billing / diagnostics)
       └─ Fleet virtualization (specialized)

ui/table.tsx  ── UNUSED ──
ui/pagination.tsx ── UNUSED ──
```

No Table Platform exists. Contrast with Card/Badge:

```
design-system/semantic-card  → SemanticKpiCard / SemanticExecutiveCard
design-system/semantic-badge → SemanticBadge
design-system/semantic-table → MISSING
```

## Risks of status quo

1. **Design System incomplete** — cards/badges unified; tables remain federated.
2. **Change amplification** — a11y (scope, sticky headers, keyboard row nav) must be applied N times.
3. **Orphan primitives** — unused shadcn Table creates false sense of SSOT.
4. **Badge regression** — table cells reintroduce local status colors.
5. **Responsive debt** — mobile reporting/settlement ledgers are scroll-only; admin already solved dual UI.

## Opportunities for consolidation

| Priority | Target | Benefit |
| --- | --- | --- |
| P0 | Admin opsTable ×5 | Highest fork count; shared tokens already exist |
| P1 | Reporting/settlement ledgers ×3 | Shared shell; Settlement already richest (filters/pagination) |
| P2 | PaymentHistory + StatisticsPanel | Owner/admin commercial directories |
| P3 | Commercial diagnostics ×2 | Lower traffic; still unify for consistency |
| Observe | Fleet virtualized table | Keep domain engine; optionally wrap chrome only |
| Observe | WorkingHoursEditor | Form matrix, not data directory |

## Proposed platform boundaries

### In scope (TABLE-PLATFORM)

| Module | Responsibility |
| --- | --- |
| `SemanticTable` | Accessible table shell, density, borders |
| `TableToolbar` | Layout slot for search/filters/actions |
| `TablePagination` | Page + load-more chrome (behavior wired by feature) |
| `TableEmptyState` / `Loading` / `Error` / `Skeleton` | Shared states |
| `TableActions` | Action column cell layout |
| `TableColumnDef` | Declarative column config (presentation) |
| `TableDensity` | compact / comfortable |
| `TableSelection` | Optional checkbox column (future-ready) |
| Status cells | **Must** use SemanticBadge |

### Out of scope (domain-owned)

- Query engines, cursors, sort APIs
- Fleet virtualization algorithm
- Working hours editing semantics
- Dining table boards / kitchen tickets / order cards
- Excel export layout
- Authorization / row-level permissions

### Data rule

Same as Cards: features pass **already-resolved** rows (labels, values, status enums from platform owners). Table Platform maps status → SemanticBadge tone only.

---

## Estimated migration complexity

| Phase | Scope | Effort (relative) |
| --- | --- | --- |
| Foundation | semantic-table package + adopt/retire ui/table | M |
| Phase 1 | Admin opsTable ×5 | M–L |
| Phase 2 | Settlement + reporting ledgers ×3 | M |
| Phase 3 | PaymentHistory + Statistics | S–M |
| Phase 4 | Commercial diagnostics | S |
| Optional | Fleet chrome wrapper | S (engine stays) |

**Overall:** Medium–Large presentation program; lower risk than Card adoption if phased and adapters keep feature data wiring intact.

---

## Risks of migration

| Risk | Mitigation |
| --- | --- |
| Visual regressions on admin dual responsive | Snapshot Accounts/Tenants first; golden path |
| Settlement pagination behavior drift | Keep page state in feature; platform only chrome |
| Over-abstracting Fleet | Do not replace VirtualizedFleetTable; optional shell only |
| Scope creep into TanStack prematurely | Start with presentational SemanticTable; add headless later if needed |
| Breaking diagnostics tools | Phase last; low user traffic |

---

## ADR outline (if TABLE-PLATFORM-ADOPTION-1 approved)

**Title:** Canonical Semantic Table Platform  

**Context:** 14 table UIs; unused shadcn Table; Design System gap after Cards/Badges.  

**Decision:** Introduce `design-system/semantic-table` as presentation SSOT for directory/ledger tables.  

**Consequences:**  
(+) Consistency, a11y, badge compliance  
(−) Migration effort; temporary dual systems during phases  

**Alternatives considered:**  
1. Adopt unused shadcn Table only (insufficient — no toolbar/states/responsive policy)  
2. Introduce TanStack Table immediately (heavy; premature without column SSOT)  
3. No action (reject — debt continues)

**Status:** Proposed pending Architecture Authority.
