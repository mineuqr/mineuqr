# PRINT-PRODUCTION-VALIDATION-1 — Test Environment

## Program Type

Production Validation & Certification — **no code changes**.

## Validation Run

| Field | Value |
|-------|-------|
| Program | PRINT-PRODUCTION-VALIDATION-1 |
| Date | 2026-06-30 |
| Validator | Architecture certification (automated + code-path review) |
| Physical hardware session | **Not executed in this run** |

## Target Architecture Stack

```
Order → Read Platform → Print Workspace → Printing Service
  → PrintConnectorPort → Connector Runtime → Deployment Runtime (embedded)
  → Platform Adapter → Transport Adapter → OS → Physical Printer
```

## Environments

### Automated (Completed)

| Environment | Purpose | Result |
|-------------|---------|--------|
| Local dev workspace | `npm run check` | PASS |
| Local dev workspace | Printing module Vitest (26 tests) | PASS |

### Production / Physical (Required — Not Completed)

| Requirement | Status |
|-------------|--------|
| Real restaurant tenant | **Pending** |
| Production or staging API host with printer attached | **Pending** |
| Migrations `0047_printing_service`, `0048_print_connector` applied | **Unverified** |
| `ORDER_READ_PROJECTIONS_ENABLED` active with backfilled data | **Unverified** |

## Preconditions for Physical Validation

1. API process runs on the **same host** as the physical printer (embedded deployment model).
2. `PRINT_CONNECTOR_DEPLOYMENT` unset or `embedded` (default).
3. `PRINT_CONNECTOR_MODE` not set to `simulated` in production.
4. OS print subsystem configured (Windows: printer installed; macOS/Linux: CUPS queue).
5. Operator has Dashboard access → Print tab.

## Manual Validation Entry Point

1. Dashboard → restaurant → **Print** section.
2. Printer panel → discover → select printer.
3. Select order → **Print** / **Reprint**.

There is no separate “test page” API; use **Print** on a real or test order as the test-print surrogate.
