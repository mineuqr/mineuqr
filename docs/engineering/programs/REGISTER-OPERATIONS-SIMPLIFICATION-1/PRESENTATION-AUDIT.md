# REGISTER-OPERATIONS-SIMPLIFICATION-1 — Presentation Audit

| Field | Value |
|---|---|
| **Program** | REGISTER-OPERATIONS-SIMPLIFICATION-1 |
| **Date** | 2026-07-25 |

## Classification (pre-change)

| Element | Class | Notes |
|---------|-------|-------|
| Register list / selector | Operational | Needed only for multi-register |
| Search registers | Optional | Multi only |
| Station mode toggle | Optional / Manager | Hide in simple mode |
| Duty status | Required | Keep (friendly) |
| Catalog status + version | Developer-facing | Hide from primary UI |
| Operator user ID input | Developer-facing | Remove |
| Device ID input | Developer-facing | Remove |
| Assign / reassign / release | Operational / advanced | Hide in simple |
| Attach / replace / detach | Operational / advanced | Hide in simple |
| financialShiftId / op id in history | Developer-facing | Hide |
| Open / Close / Resume | Required | State-adaptive |
| Suspend | Optional advanced | Multi layout only |
| Recovery / resolveActive | Developer-facing | Hide in simple |
| Empty create CTA | Manager-facing | Keep + activate guidance |

## Internal exposure to remove

- Numeric operator IDs
- Raw `deviceId` / UUIDs
- `financialShiftId`, `version` chips
- Always-visible disabled actions
