# MULTI-CHECK-ALLOCATION-PRESENTATION-1 — Implementation Report

| Field | Value |
|---|---|
| **Status** | Implemented |
| **Date** | 2026-07-23 |
| **Type** | Presentation (API consumer) |
| **ADR** | ADR-ARCH-025 · ADR-ARCH-024 · ADR-ARCH-023 · ADR-ARCH-022 · ADR-ARCH-021 · ADR-ARCH-020 |
| **Prior** | DOMAIN · PERSISTENCE · MIGRATION · INTEGRATION · PROJECTION · API (certified) |

---

## Objective

Deliver a production-ready Multi Check Allocation experience inside the Check Workspace, consuming **only** the canonical `multiCheckAllocation.*` API.

---

## Delivered

| Artifact | Path |
|----------|------|
| Presentation lib | `client/src/lib/multi-check-allocation-presentation/` |
| Hooks (read + write) | `useMultiCheckAllocationQueries.ts` · `useMultiCheckAllocationMutations.ts` |
| View Models / copy / errors | `multiCheckAllocationViewModel.ts` · `Copy` · `ErrorPresentation` |
| Workspace panel + components | `client/src/components/multi-check-allocation/` |
| Workspace adoption | `DiningSessionWorkspaceSheet.tsx` |
| Cache invalidation | `DiningSessionActionBar` · `SessionRowQuickActions` |
| Tests + guards | `multi-check-allocation-presentation/__tests__/` |
| Report | `docs/engineering/programs/MULTI-CHECK-ALLOCATION-PRESENTATION-1/IMPLEMENTATION-REPORT.md` |

---

## Components

| Component | Role |
|-----------|------|
| `MultiCheckAllocationPanel` | Check Workspace entry |
| `AllocationSummaryCard` | Identity + money summary |
| `AllocationResponsibilityView` | Responsibility snapshot |
| `AllocationPortionList` | Portion breakdown |
| `AllocationAdjustmentHistory` | Adjustment history |
| `AllocationReversalHistory` | Reversal history |
| `AllocationTimeline` | Timeline |
| `AllocationMetadataView` | Projection / API contract diagnostics |
| `AllocationActionBar` | Lifecycle actions |
| `CreateAllocationDialog` / `AdjustAllocationDialog` | Mutation forms |
| Loading / Empty / Error / Success | Operational states + toasts |

---

## Workflows (API only)

| Workflow | API procedure |
|----------|---------------|
| Create | `createAllocation` |
| Reserve | `reserveAllocation` |
| Apply | `applyAllocation` |
| Adjust | `adjustAllocation` |
| Reverse | `reverseAllocation` |
| Complete | `completeAllocation` |
| Cancel | `cancelAllocation` |

After success: invalidate `multiCheckAllocation.*` queries and show toast feedback.  
No local business-state mutation. No Projection / Integration access.

---

## Workspace adoption governance

- Exposed in `DiningSessionWorkspaceSheet` alongside Order Settlement and Split Payment
- Discoverable in the standard settlement workflow (no hidden routes)
- Operators can execute the full allocation lifecycle from the Check Workspace

---

## UX consistency

Reuses restaurant dashboard panel styles, buttons, dialogs, alert confirmations, status badges, spacing, and bilingual copy patterns from Financial Settlement surfaces.

---

## Accessibility

- Section / group labels
- `aria-expanded` on allocation rows
- `aria-busy` / `role="status"` loading
- `role="alert"` errors
- Color-independent status text labels

---

## Out of scope (confirmed)

No Architecture · Domain · Persistence · Integration · Projection · API · Reporting changes.

---

## Ready for

**MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1**
