# PRINT-PRODUCTION-VALIDATION-2 — Test Evidence

**Date:** 2026-06-30  
**Environment:** Developer workstation (Windows); no staging/production deployment exercised

---

## Automated Evidence

### Static Analysis

| Command | Timestamp | Result | Output summary |
|---------|-----------|--------|----------------|
| `npm run check` | 2026-06-30 (PRINT-PRINTER-CATALOG-1) | **PASS** | TypeScript clean |
| `npm test` (full suite) | 2026-06-30 (PRINT-PRINTER-CATALOG-1) | **PASS** | 1301 passed, 3 skipped, 239 files |

### Architecture Guards (PRINT-PRODUCTION-VALIDATION-2 run)

```
npx vitest run \
  server/printer-management/__tests__/catalog.architecture.guards.test.ts \
  server/print-workspace/__tests__/discovery.architecture.guards.test.ts \
  server/connector-gateway/__tests__/architecture.guards.test.ts \
  server/connector-session/__tests__/architecture.guards.test.ts \
  server/connector-local/__tests__/architecture.guards.test.ts \
  server/print-connector/__tests__/architecture.guards.test.ts \
  server/printing/__tests__/architecture.guards.test.ts \
  server/printer-management/__tests__/ux.architecture.guards.test.ts
```

| Metric | Value |
|--------|-------|
| Test files | 8 passed |
| Tests | 46 passed |
| Duration | 7.98s |
| Exit code | 0 |

---

## Behavioral Test Evidence — Printer Catalog (ADR-ARCH-017)

### Read purity — legacy selection ignored

**File:** `server/printer-management/__tests__/PrinterManagementService.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| `getCurrentPrinter is read-only and does not migrate legacy selection` | `configured: false`; `repo.save` not called despite `getSelectedPrinter` returning legacy row | **PASS** |
| `deleted printer does not reappear on getCurrentPrinter polling` | Two consecutive polls return `configured: false`; no `save` | **PASS** |
| `returns unconfigured current printer when empty` | No `getSelectedPrinter` call | **PASS** |

### Provision path

| Test | Assertion | Result |
|------|-----------|--------|
| `provisions printer via connector and repository` | `connector.selectPrinter` + `repo.save` called | **PASS** |

### Migration safety

**File:** `server/printer-management/__tests__/LegacyPrinterSelectionMigrator.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Skips when active default exists | `migrated: 0`, `skipped: 1` | **PASS** |

---

## Behavioral Test Evidence — Distributed Topology (ADR-ARCH-016)

### Gateway routing

**File:** `server/connector-gateway/__tests__/ConnectorGatewayService.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Routes print to execution port | `executePrint` invoked with correct payload | **PASS** |
| Fails when connector unregistered | `failureReason: connector_unregistered` | **PASS** |

### Remote print connector port

**File:** `server/connector-gateway/__tests__/RemotePrintConnectorPort.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Submits via gateway routePrint | `reportPrintSuccess` on routed | **PASS** |
| Reports failure when unregistered | `reportPrintFailure` | **PASS** |

### Session reconnect

**File:** `server/connector-session/__tests__/DuplicateSession.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Replaces existing session when same connector reconnects | Session identity updated | **PASS** |

### Heartbeat

**File:** `server/connector-session/__tests__/ConnectorHeartbeatProtocol.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Records heartbeat in gateway and keeps session healthy | Gateway heartbeat called | **PASS** |

### Windows gateway discovery integration

**File:** `server/connector-local/__tests__/WindowsGatewayDiscoveryIntegration.test.ts`

| Test | Assertion | Result |
|------|-----------|--------|
| Discovery fails gracefully when connector offline | `failureReason` matches `connector_(offline\|unregistered)` | **PASS** |

---

## Static Audit Evidence — Execution Path Traces

### PASS: Printer management uses gateway only

```
printerManagementRouter.ts
  → PrinterManagementService
    → GatewayRoutedPrintConnectorApi
      → ConnectorGatewayService
        → SessionConnectorExecutionPort
          → ConnectorCommandRouter
            → RLC RuntimeConnectorCommandHandler
```

**Guard:** `discovery.architecture.guards.test.ts` L31–38 — composition contains `GatewayRoutedPrintConnectorApi`, not `printConnectorRuntime`.

### FAIL: Order print default path (embedded bypass)

```
printWorkspaceRouter.commands.printOrder
  → PrintWorkspaceCommandService.printOrder
    → PrintingService.requestPrint
      → PrintDispatchCoordinator.dispatchPendingJob
        → PrintConnectorPort.submit
          → PrintingServicePrintConnectorAdapter  ← DEFAULT
            → printConnectorRuntime (in-process on cloud host)
```

**Evidence:** `printingComposition.ts` L40–43 when `PRINT_CONNECTOR_EXECUTION_MODE` ≠ `remote`.

### FAIL: Cancel does not reach RLC

```
printWorkspaceRouter.commands.cancelPrint
  → PrintWorkspaceCommandService.cancelPrint
    → PrintingService.cancelPrint
      → completeJob(status: "cancelled")   ← STOPS HERE
```

**Unused stack:**

```
GatewayRoutedPrintConnectorApi.cancel
  → ConnectorGatewayService.routeCancelPrint
    → SessionConnectorExecutionPort.executeCancelPrint
      → ConnectorCommandRouter.routeCancelPrint
        → RuntimeConnectorCommandHandler.handleCancelPrint
```

**Evidence:** Grep for production callers of `GatewayRoutedPrintConnectorApi.cancel` — adapter definition and tests only.

---

## Runtime Evidence — NOT COLLECTED

The following certification scenarios require a staging or production environment with RLC installed and (where applicable) physical printer hardware. **No evidence collected in this program run.**

| Scenario | Status |
|----------|--------|
| Gateway reconnect under load | **NOT EXECUTED** |
| Connector reconnect after network drop | **NOT EXECUTED** |
| Windows restart + RLC auto-start | **NOT EXECUTED** |
| Fresh restaurant: Discovery → Provision → Print E2E | **NOT EXECUTED** |
| Upgrade: M-1 migration on production-like DB | **NOT EXECUTED** |
| Failure: gateway unavailable during print | **NOT EXECUTED** |
| Failure: printer offline during print | **NOT EXECUTED** |
| Physical order print on thermal printer | **NOT EXECUTED** |

**Prior program:** PRINT-PRODUCTION-VALIDATION-1 reached the same conclusion — physical validation not executed (`09-Production-Certification.md`).

---

## Deployment Configuration Evidence

| Variable | Required for production | Found in repo config |
|----------|-------------------------|----------------------|
| `PRINT_CONNECTOR_EXECUTION_MODE=remote` | **Yes** (ADR-ARCH-016 Rule 18) | **NOT FOUND** in deployment files |
| `PRINT_CONNECTOR_MODE=simulated` | **Must NOT be set** on prod cloud | Documented only in test/dev docs |
| `RLC_RUNTIME=1` | **Yes** on connector host | Documented in PRINT-CONNECTOR-WINDOWS-1 |

**Grep scope:** All `*.ts`, `*.yml`, `*.yaml`, `*.json`, `*.env*` — `PRINT_CONNECTOR_EXECUTION_MODE` appears only in `printingComposition.ts` and program documentation.

---

## Catalog Integrity Evidence — Repository Queries

All catalog reads filter active rows by `restaurantId`:

```31:35:server/printer-management/infrastructure/DrizzleRestaurantPrinterRepository.ts
    const rows = await db
      .select()
      .from(restaurantPrinters)
      .where(and(eq(restaurantPrinters.restaurantId, restaurantId), eq(restaurantPrinters.isActive, true)))
```

`getDefault`, `findByPrinterId`, `remove`, `setDefault` all scope by `restaurantId` + `printerId`.

---

## Multi-Tenant Access Control Evidence

Every print workspace and printer management endpoint:

```52:54:server/printer-management/printerManagementRouter.ts
    provisionPrinter: verifiedProcedure.input(provisionInput).mutation(async ({ input, ctx }) => {
      await assertRestaurantAccess(ctx, input.restaurantId, "printerManagement.commands.provisionPrinter");
      return printerManagementService.provisionPrinter(input);
```

Same pattern for all 8 printer management procedures and 12 print workspace procedures (`printWorkspaceRouter.ts`).

---

## Observability Evidence — Print Ops Events

```6:13:server/printing/domain/PrintOperationalEvent.ts
export const PRINT_OPERATIONAL_EVENTS = {
  PrintRequested: "PrintRequested",
  PrintDispatched: "PrintDispatched",
  PrintStarted: "PrintStarted",
  PrintCompleted: "PrintCompleted",
  PrintFailed: "PrintFailed",
  PrintCancelled: "PrintCancelled",
};
```

Published via `OpsPrintStatusPublisher` → `opsLog` with `restaurantId`, `printJobId`, `orderId` metadata.

Remote submission additionally logs:

```21:34:server/connector-gateway/adapters/RemotePrintConnectorPort.ts
    opsLog({
      type: OPS_EVENT.print_connector_submission,
      // ...
      metadata: { executionMode: "remote", jobId, orderId, correlationId },
    });
```

---

## Evidence Gaps Preventing Full Certification

1. No staging deployment with `PRINT_CONNECTOR_EXECUTION_MODE=remote` verified
2. No E2E cancel test with active RLC execution
3. No M-1 migration run on production-like dataset with before/after catalog snapshot
4. No physical printer validation (inherited from PRINT-PRODUCTION-VALIDATION-1)
5. Formal FF-PC-01..04 fitness function IDs absent from CI

---

## Evidence Summary

| Category | Evidence type | Sufficiency for full certification |
|----------|---------------|-------------------------------------|
| ADR-ARCH-017 catalog rules | Unit tests + guards + static audit | **Sufficient** |
| ADR-ARCH-016 distributed execution | Partial — embedded default | **Insufficient** |
| Runtime / physical | None | **Insufficient** |
| Governance (FF-PC) | Guards only | **Insufficient** (documented gap) |
