# PRINT-PRODUCTION-CERTIFICATION-BLOCKERS-1 — Implementation

**Date:** 2026-06-30  
**Authority:** ADR-ARCH-016 · ADR-ARCH-017 v1.1 · PRINT-ARCHITECTURE-2  
**Status:** Complete

---

## Objective

Remove PRINT-PRODUCTION-VALIDATION-2 certification blockers PV2-BLOCK-001 and PV2-BLOCK-002 without architectural redesign.

---

## Blocker 1 — Canonical Production Path

### Problem

Order print defaulted to embedded `PrintConnectorRuntime` on the cloud API host unless `PRINT_CONNECTOR_EXECUTION_MODE=remote` was set.

### Solution

| Change | Detail |
|--------|--------|
| Default execution mode | **Remote** (`RemotePrintConnectorPort` → Gateway → RLC) |
| Production hard lock | `NODE_ENV=production` always uses remote |
| Embedded opt-in only | `PRINT_CONNECTOR_EXECUTION_MODE=embedded` outside production (local dev/tests) |
| `routeExecutePrint` | `RemotePrintConnectorPort` now uses `routeExecutePrint` (captures `executionId`) instead of `routePrint` |

### Files

| Path | Change |
|------|--------|
| `server/printing/resolvePrintConnectorExecutionMode.ts` | **New** — execution mode resolver |
| `server/printing/printingComposition.ts` | Default remote; pass connector to `PrintingService` |
| `server/connector-gateway/adapters/RemotePrintConnectorPort.ts` | `routeExecutePrint`; return `executionId` |

---

## Blocker 2 — Workspace Cancel Wiring

### Problem

`printWorkspace.commands.cancelPrint` updated cloud job state only. Gateway cancel pipeline existed but was unwired.

### Solution

| Layer | Change |
|-------|--------|
| `PrintConnectorPort` | Added `cancel()` and `submit()` now returns `{ executionId }` |
| `PrintDispatchCoordinator` | Stores `executionId` in attempt metadata after gateway dispatch |
| `PrintingService.cancelPrint` | Routes cancel through `PrintConnectorPort` before completing job |
| `RemotePrintConnectorPort.cancel` | Calls `gateway.routeCancelPrint` |

### Cancel flow

```
printWorkspace.commands.cancelPrint
  → PrintWorkspaceCommandService.cancelPrint
    → PrintingService.cancelPrint
      → PrintConnectorPort.cancel (RemotePrintConnectorPort)
        → ConnectorGatewayService.routeCancelPrint
          → SessionConnectorExecutionPort.executeCancelPrint
            → RLC RuntimeConnectorCommandHandler.handleCancelPrint
      → completeJob(status: cancelled)
```

### Files

| Path | Change |
|------|--------|
| `server/printing/contracts/ports/PrintConnectorPort.ts` | `cancel`, `PrintConnectorSubmissionResult` |
| `server/printing/application/PrintingService.ts` | Connector cancel before job completion |
| `server/print-connector/infrastructure/adapters/PrintingServicePrintConnectorAdapter.ts` | Embedded dev cancel support |
| `server/printing/infrastructure/connector/NoOpPrintConnectorPort.ts` | Stub cancel |

---

## Architecture Guards

New: `server/printing/__tests__/productionCertification.architecture.guards.test.ts`

Updated:
- `server/connector-gateway/__tests__/architecture.guards.test.ts`
- `server/connector-session/__tests__/architecture.guards.test.ts`
- `server/connector-local/__tests__/architecture.guards.test.ts`

---

## Affected Execution Paths

| Operation | Before | After |
|-----------|--------|-------|
| Order print (production) | Embedded default | Gateway → RLC (always) |
| Order print (dev) | Embedded default | Remote default; embedded explicit opt-in |
| Workspace cancel | Cloud DB only | Gateway → RLC → platform cancel + DB |

---

## ADR Compliance

| ADR | Impact |
|-----|--------|
| ADR-ARCH-016 Rule 18 | **Resolved** — single canonical production path |
| ADR-ARCH-017 | **Unchanged** — no catalog changes |
