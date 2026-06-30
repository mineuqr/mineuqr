# PRINT-WORKSPACE-1 — Architecture Traceability

**Date:** 2026-06-29

---

## Constitution Compliance

| Rule | Evidence |
|------|----------|
| Order is Core Domain | Workspace read-only; no order mutations |
| Read Models from events | Data from `order_read_*` (Phase 3B populated) |
| Operational Workspaces consume Read Models | ✓ |
| Printing is Service | No print service in workspace |
| One Production Path | Single read API namespace |
| No legacy print stack | No Host/Agent/queue |

---

## Program Dependencies

| Upstream | Status |
|----------|--------|
| ORDERS-READ-MODEL-1 Phase 3B | ✓ Projections active + backfilled |
| PRINTING-1 | Not required for workspace UI (order views) |
| PRINT-CONNECTOR-1 | Future — action implementation |

---

## Files Added

| Path | Role |
|------|------|
| `server/print-workspace/` | Read API + contracts |
| `client/src/components/print-workspace/` | UI panel |
| `client/src/lib/print-workspace/` | State, VMs, contracts |

---

## Exit Criteria

| Criterion | Met |
|-----------|-----|
| Workspace exists | ✓ |
| Read model only | ✓ |
| No printing logic | ✓ |
| Action contracts defined | ✓ |
| Composition complete | ✓ |
| Tests pass | ✓ |
| No production behavior change (orders tab unchanged) | ✓ |
