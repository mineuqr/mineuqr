# PRINT-PRODUCTION-VALIDATION-2 — Architecture Compliance

**Date:** 2026-06-30  
**Method:** Static code audit, architecture guard execution, unit test review  
**No production code modified.**

---

## ADR-ARCH-016 — Distributed Printing Topology

| Rule / Requirement | Status | Evidence |
|--------------------|--------|----------|
| Rule 1–2: RLC outbound session | **PASS** | `ConnectorSessionClient` uses `sendInbound`; `architecture.guards.test.ts` confirms no inbound accept from RLC services |
| Rule 5: Gateway never prints | **PASS** | `ConnectorGatewayService` routes only; guard: no `PlatformAdapter` in gateway service |
| Rule 6–7: RLC infrastructure only | **PASS** | `connector-local/__tests__/architecture.guards.test.ts` — no `PrintingService` / `OrderRepository` in RLC services |
| Rule 8: No direct client → RLC | **PASS** | All print workspace APIs go through tRPC → cloud services → gateway |
| Rule 9: Connector Session SSOT | **PASS** | `ConnectorRegistry` + `ConnectorSessionManager`; heartbeat via `ConnectorHeartbeatProtocol` |
| Rule 11: Deployment at composition root | **PASS** | `printingComposition.ts` L15–43; `printConnectorComposition.ts` |
| Rule 18: Canonical execution path | **FAIL** | Order print defaults to embedded unless env override — see §Execution Path Deviation |
| Rule 19–20: PlatformAdapterHost + Facade | **PASS** | `RuntimeConnectorCommandHandler` delegates to `LocalConnectorRuntimeFacade` |
| Rule 21: No simulated fallback in production | **CONDITIONAL** | Blocked on RLC when `RLC_RUNTIME=1`; cloud embedded path can still use simulated adapter if `PRINT_CONNECTOR_MODE=simulated` |

### Execution Path Deviation (Rule 18)

```15:43:server/printing/printingComposition.ts
function resolvePrintConnectorExecutionMode(): "embedded" | "remote" {
  const configured = process.env.PRINT_CONNECTOR_EXECUTION_MODE?.trim().toLowerCase();
  return configured === "remote" ? "remote" : "embedded";
}
// ...
const printConnectorPort =
  resolvePrintConnectorExecutionMode() === "remote"
    ? connectorGatewayComposition.createRemotePrintConnectorPort(printResultPort)
    : new PrintingServicePrintConnectorAdapter(printConnectorRuntime, printResultPort);
```

**Finding:** Default composition wires `PrintingServicePrintConnectorAdapter` → in-process `printConnectorRuntime` on the cloud API host. This bypasses Gateway → RLC for order print.

**PRINT-ARCHITECTURE-2** explicitly states: *"`embedded` connector is non-production for distributed restaurants"* (`15-Final-Executive-Summary.md` L18).

**Remote path exists and is correct when enabled:**

```36:43:server/connector-gateway/adapters/RemotePrintConnectorPort.ts
    const route = await this.gateway.routePrint({
      jobId: submission.jobId,
      restaurantId: submission.restaurantId,
      // ...
    });
```

**Deployment evidence:** No repository configuration file sets `PRINT_CONNECTOR_EXECUTION_MODE=remote` (grep: only `printingComposition.ts` and program docs).

---

## ADR-ARCH-017 v1.1 — Printer Catalog Ownership and Lifecycle

| Rule / Invariant | Status | Evidence |
|------------------|--------|----------|
| SSOT-1: One catalog authority (`restaurant_printers`) | **PASS** | `printerManagementComposition.ts` — `DrizzleRestaurantPrinterRepository` only |
| SSOT-2: No parallel selection store (cloud) | **PASS** | `GatewayRoutedPrintConnectorApi.getSelectedPrinter` returns `null`; no `DrizzlePrinterSelectionRepository` in composition |
| DISC-1..8: Discovery rules | **PASS** | `PrintWorkspaceDiscoveryReadService` calls `routeDiscoverPrinters` only; guard confirms no `.save(` |
| DEL-1: Coordinated delete | **PASS** | `DrizzleRestaurantPrinterRepository.remove` sets `isActive: false`, `isDefault: false` |
| RP-1: Read purity | **PASS** | `getCurrentPrinter` uses `getDefault` only; no `getSelectedPrinter`, no `printers.save` |
| DISC-5 / PROV: Provision only path to Registered | **PASS** | `provisionPrinter` → `catalog.save`; only other writes are explicit mutations (rename, setDefault, markValidated) |
| M-1: One-time migration (not query-time) | **PASS** | `LegacyPrinterSelectionMigrator` + `0050` SQL; not in request path |
| M-2: Remove query migration | **PASS** | Removed from `getCurrentPrinter`; test `PrinterManagementService.test.ts` L112–171 |
| M-3: Stop dual-write | **PASS** | `selectPrinter` routes to RLC only; no `saveSelection` on cloud |

### Registry vs ADR Document Metadata

| Source | ADR-ARCH-017 implementation status |
|--------|-------------------------------------|
| `ADR-Registry.md` | **Implemented** (PRINT-PRINTER-CATALOG-1) |
| `ADR-ARCH-017` header L14 | **Not implemented** (stale) |

Software audit confirms implementation; ADR document header not updated.

---

## PRINT-ARCHITECTURE-2 Alignment

| Decision | Status | Evidence |
|----------|--------|----------|
| RLC is production execution host | **PASS** (when remote mode) | Gateway → session → `RuntimeConnectorCommandHandler` |
| Cloud retains job + catalog authority | **PASS** | `PrintingService` + `PrinterManagementService` |
| Browser → Cloud → Gateway → RLC | **PASS** for printer mgmt ops | All `GatewayRoutedPrintConnectorApi` paths |
| Embedded non-production | **FAIL** (default wiring) | See Rule 18 deviation above |
| Connector Session SSOT for connectivity | **PASS** | `ConnectorRegistry`, heartbeat, reconnect policy |

---

## Runtime Boundary Verification

| Layer | Owns | Does NOT own | Evidence |
|-------|------|--------------|----------|
| **Cloud** | Print jobs, catalog, orchestration, tenant access | OS print I/O | `PrintingService`, `PrinterManagementService` |
| **Gateway** | Routing, resolver, health, registry | Physical print, catalog | `ConnectorGatewayService`; guard: no `PrintJobRepository` in gateway services |
| **RLC** | Discovery, execution, platform adapters, session client | Orders, business rules | `connector-local` guards |
| **Windows / OS** | Spooler, device I/O | Cloud state | `WindowsPlatformAdapter` in RLC only |

**No responsibility leakage detected** in static audit of production wiring.

---

## Deviations Summary

| ID | ADR | Deviation | Severity |
|----|-----|-----------|----------|
| DEV-001 | ADR-ARCH-016 Rule 18 | Order print embedded default on cloud | **Blocking** |
| DEV-002 | ADR-ARCH-016 | Cancel not propagated to RLC | **Blocking** |
| DEV-003 | ADR-ARCH-017 M-1 | Migration not verified in target environment | **Blocking** (ops) |
| DEV-004 | Governance | FF-PC-01..04 not declared | **Non-blocking** |

---

## Compliance Verdict

| ADR | Software Audit | Production Deployment |
|-----|----------------|----------------------|
| ADR-ARCH-017 v1.1 | **COMPLIANT** | **CONDITIONAL** (M-1 not verified) |
| ADR-ARCH-016 v1.2 | **PARTIAL** | **NON-COMPLIANT** (embedded default; cancel gap) |
| PRINT-ARCHITECTURE-2 | **PARTIAL** | **NON-COMPLIANT** (same as ADR-016 for order print) |
