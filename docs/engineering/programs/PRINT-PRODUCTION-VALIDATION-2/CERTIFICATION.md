# PRINT-PRODUCTION-VALIDATION-2 — Certification Report

**Date:** 2026-06-30  
**Certifier:** Architecture audit (static + automated tests)  
**Scope:** Full 16 certification areas per program charter

---

## Certification Decision

# Conditionally Certified

---

## 1. Architecture Compliance

| Check | Result | Evidence |
|-------|--------|----------|
| ADR-ARCH-016 fully implemented | **FAIL** | Order print embedded default (`printingComposition.ts` L15–43); see ARCHITECTURE-COMPLIANCE.md |
| ADR-ARCH-017 fully implemented (software) | **PASS** | Catalog SSOT, read purity, legacy retirement — PRINT-PRINTER-CATALOG-1 |
| Deviations documented | **PASS** | DEV-001 through DEV-004 in ARCHITECTURE-COMPLIANCE.md |

---

## 2. Execution Path

Every operation traced Cloud → Gateway → RLC. **No bypass** required for catalog operations. **Bypass exists** for order print in default configuration.

| Operation | Gateway → RLC | Embedded bypass | Catalog DB | Result |
|-----------|:-------------:|:---------------:|:----------:|:------:|
| **Discovery** | ✅ `routeDiscoverPrinters` | None | None | **PASS** |
| **Provision** | ✅ `routeGetPrinterStatus`, `routeSelectPrinter` | None | `restaurant_printers` WRITE | **PASS** |
| **Set Default** | ✅ `routeSelectPrinter` | None | `restaurant_printers` WRITE | **PASS** |
| **Print (order)** | ⚠️ only if `remote` | ✅ default embedded | Print jobs only | **FAIL** |
| **Cancel** | ❌ unwired | N/A | Job status only | **FAIL** |
| **Test Print** | ✅ `routeExecutePrint` | None | `lastValidatedAt` WRITE | **PASS** |
| **Delete** | N/A (catalog-only) | None | soft deactivate | **PASS** |
| **Status** | ✅ `routeGetPrinterStatus` | None | READ | **PASS** |

### Code References — Certified Paths

**Discovery:** `PrintWorkspaceDiscoveryReadService.ts` L13–24 → `ConnectorGatewayService.routeDiscoverPrinters` → `SessionConnectorExecutionPort.executeDiscoverPrinters`

**Provision:** `PrinterManagementService.provisionPrinter` L74–98 → `printers.save` + `connector.selectPrinter`

**Set Default:** `PrinterManagementService.setDefaultPrinter` L123–135 → `printers.setDefault` + `connector.selectPrinter`

**Test Print:** `PrinterManagementService.testPrint` L156–206 → `connector.print` → `routeExecutePrint`

**Delete:** `DrizzleRestaurantPrinterRepository.remove` L141–160

**Status:** `PrinterManagementService.getCurrentPrinter` L47–71 → `getDefault` + `connector.getStatus`

### Code References — Failed Paths

**Order Print (embedded):** `printingComposition.ts` L40–43 → `PrintingServicePrintConnectorAdapter(printConnectorRuntime)`

**Cancel (unwired):** `PrintingService.cancelPrint` L242–257 — DB only; `GatewayRoutedPrintConnectorApi.cancel` L137–158 has zero production callers

---

## 3. Runtime Boundary Verification

| Boundary | Result | Evidence |
|----------|--------|----------|
| Cloud owns orchestration | **PASS** | `PrintingService`, `PrinterManagementService`, `ConnectorGatewayService` |
| Gateway owns routing | **PASS** | `ConnectorResolver`, `ConnectorCommandRouter` |
| RLC owns local execution | **PASS** | `RuntimeConnectorCommandHandler`, `PrintConnectorRuntime` on RLC host |
| Windows owns printing | **PASS** | `WindowsPlatformAdapter` hosted by `PlatformAdapterHost` |
| No responsibility leakage | **PASS** | Architecture guards across gateway, session, local, printing modules |

---

## 4. Catalog Integrity

| Check | Result | Evidence |
|-------|--------|----------|
| `restaurant_printers` only authority | **PASS** | `printerManagementComposition.ts`; guard L23–27 |
| No legacy fallback reads | **PASS** | `getSelectedPrinter` not called from `PrinterManagementService` |
| No dual writes | **PASS** | No `saveSelection` on cloud path |
| No hidden persistence | **PASS** | `DrizzlePrinterSelectionRepository` unwired (file exists, 0 production instantiations) |
| No stale migration on read | **PASS** | `getCurrentPrinter` body guard; unit test L112–138 |

---

## 5. Read Purity

| Query API | Writes? | Result | Evidence |
|-----------|---------|--------|----------|
| `getCurrentPrinter` | No | **PASS** | `PrinterManagementService.ts` L47–71 |
| `listPrinters` | No | **PASS** | L39–40 |
| `discoverPrinters` (read) | No | **PASS** | `PrintWorkspaceDiscoveryReadService.ts` L13–24 |
| `getDiagnostics` | No | **PASS** | L138–154 |
| `getDiagnosticsSummary` | No | **PASS** | `PrintWorkspacePresenceReadService.ts` L139–180 |

**Note:** `testPrint` writes `lastValidatedAt` but is exposed as a **mutation**, not a query — permitted.

---

## 6. Discovery

| Check | Result | Evidence |
|-------|--------|----------|
| Observation only | **PASS** | No catalog repository in discovery services |
| No catalog writes | **PASS** | Guard: no `.save(` in discovery service |
| No registration | **PASS** | Discovery returns DTO list only |
| No default mutation | **PASS** | No `setDefault` in discovery path |

---

## 7. Provision

| Check | Result | Evidence |
|-------|--------|----------|
| Only Discovered → Registered bridge | **PASS** | `provisionPrinter` is sole `catalog.save` with `isActive: true` on command path |
| M-1 migration is explicit offline job | **PASS** | `LegacyPrinterSelectionMigrator.ts`; not in API layer |

---

## 8. Delete

| Scenario step | Result | Evidence |
|---------------|--------|----------|
| Delete printer | **PASS** | `remove` sets `isActive: false`, `isDefault: false` |
| Refresh UI (poll `getCurrentPrinter`) | **PASS** | Unit test: deleted printer does not reappear L141–171 |
| Reconnect Gateway | **NOT EXECUTED** | No runtime test |
| Restart RLC | **NOT EXECUTED** | No runtime test |
| Rediscover printer | **PASS** (software) | Discovery independent of catalog per ADR DISC-3/4 |
| Deleted printer does NOT auto-restore | **PASS** | No read-path migration; legacy selection ignored |

---

## 9. Reconnect

| Scenario | Result | Evidence |
|----------|--------|----------|
| Gateway reconnect | **CONDITIONAL** | `ConnectorReconnectPolicy.ts`; no E2E evidence |
| Connector reconnect | **PASS** (unit) | `DuplicateSession.test.ts` — replaces session on reconnect |
| Network interruption | **NOT EXECUTED** | — |
| Connector restart | **NOT EXECUTED** | — |
| Windows restart | **NOT EXECUTED** | — |
| Heartbeat recovery | **PASS** (unit) | `ConnectorHeartbeatProtocol.test.ts` |

---

## 10. Fresh Installation

| Step | Result | Evidence |
|------|--------|----------|
| New restaurant → Install RLC | **NOT EXECUTED** | — |
| Discovery → Provision → Set Default → Print | **CONDITIONAL** | Software paths exist; no E2E without legacy migration in request path |
| Works without legacy migration | **PASS** (software) | No query-time migration; fresh tenant uses empty catalog |

---

## 11. Upgrade Scenario

| Check | Result | Evidence |
|-------|--------|----------|
| Migration tooling exists | **PASS** | `0050_migrate_legacy_printer_selections.sql`, `LegacyPrinterSelectionMigrator.ts` |
| Skips soft-deleted printers | **PASS** | Migrator L36–50; unit test |
| Skips when active default exists | **PASS** | Migrator L30–33; unit test |
| Executed on production tenants | **NOT VERIFIED** | Checklist open in PRINT-PRINTER-CATALOG-1/VALIDATION.md |
| No duplicated printers | **NOT VERIFIED** | Requires runtime migration run |
| Defaults preserved | **NOT VERIFIED** | Requires runtime migration run |

---

## 12. Multi-Tenant Isolation

| Check | Result | Evidence |
|-------|--------|----------|
| API access control | **PASS** | All `printerManagement.*` and `printWorkspace.*` routes call `assertRestaurantAccess` |
| Catalog queries scoped | **PASS** | All repo methods filter by `restaurantId` |
| Connector resolution scoped | **PASS** | `ConnectorResolver.resolve(restaurantId)` → `registry.getSession(restaurantId)` |
| Cross-tenant printer E2E test | **NOT EXECUTED** | General tenant tests exist in `routers.test.ts`; no printer-specific cross-tenant test |

---

## 13. Observability

| Event | Observable | Result | Evidence |
|-------|------------|--------|----------|
| Print lifecycle | Yes | **PASS** | `OpsPrintStatusPublisher` → `OPS_EVENT.print_*` |
| Print connector submission (remote) | Yes | **PASS** | `RemotePrintConnectorPort` L21–34 logs `executionMode: "remote"` |
| Enrollment / session register | Partial | **CONDITIONAL** | Session `register` in transport handler; no dedicated ops taxonomy audit |
| Provision | Partial | **CONDITIONAL** | No dedicated provision ops event; catalog mutation only |
| Discovery | Partial | **CONDITIONAL** | Gateway routing; no dedicated discovery ops event |
| Cancel | Partial | **CONDITIONAL** | `PrintCancelled` ops event on cloud cancel; RLC cancel not invoked |
| Reconnect | Partial | **CONDITIONAL** | Heartbeat in gateway registry |
| Delete | Partial | **CONDITIONAL** | Catalog soft-delete; no dedicated delete ops event |
| Migration | Partial | **CONDITIONAL** | Script returns counts; no ops integration |
| Failures | Yes | **PASS** | `PrintFailed`, connector route failure reasons |

---

## 14. Failure Injection

| Scenario | Result | Evidence |
|----------|--------|----------|
| Gateway unavailable | **NOT EXECUTED** | Unit: `ConnectorGatewayService.test.ts` — unregistered connector fails route |
| Connector unavailable | **PASS** (unit) | `failureReason: connector_unregistered` / `connector_offline` |
| Printer offline | **NOT EXECUTED** | Status API can return offline from RLC |
| Printer removed | **PASS** (software) | Delete + poll test |
| Network interruption | **NOT EXECUTED** | — |
| Migration failure | **NOT EXECUTED** | Migrator returns empty on no DB |
| Recovery after restart | **NOT EXECUTED** | — |

---

## 15. Architecture Guards

| Suite | Tests | Result |
|-------|-------|--------|
| `catalog.architecture.guards.test.ts` | 6 | **PASS** |
| `discovery.architecture.guards.test.ts` | 6 | **PASS** |
| `connector-gateway/architecture.guards.test.ts` | 8 | **PASS** |
| `connector-session/architecture.guards.test.ts` | 6 | **PASS** |
| `connector-local/architecture.guards.test.ts` | 8 | **PASS** |
| `print-connector/architecture.guards.test.ts` | 5 | **PASS** |
| `printing/architecture.guards.test.ts` | 2 | **PASS** |
| `ux.architecture.guards.test.ts` | 5 | **PASS** |
| **Total** | **46** | **PASS** |

Executed: `npx vitest run` on all 8 guard files — 2026-06-30.

---

## 16. Fitness Functions

| ID | Requirement | Declared test? | Equivalent coverage | Result |
|----|-------------|----------------|---------------------|--------|
| **FF-PC-01** | Query APIs perform zero writes | **No** | `catalog.architecture.guards.test.ts` + `PrinterManagementService.test.ts` | **DOCUMENTED GAP** |
| **FF-PC-02** | Discovery owns zero persistence | **No** | `discovery` guard + `PrintWorkspaceDiscoveryReadService` audit | **DOCUMENTED GAP** |
| **FF-PC-03** | Single Printer Catalog authority | **No** | Composition guards + no `print_connector_selections` in runtime | **DOCUMENTED GAP** |
| **FF-PC-04** | Observation transitions only through Provision | **No** | Provision-only `save` path audit + guards | **DOCUMENTED GAP** |

**Per program charter:** Fitness functions not implemented — documented only. De facto enforcement exists via architecture guards. Formal FF-PC declaration recommended for CI governance.

---

## Recommended Remediation Programs

| Finding | Program type | Suggested name |
|---------|--------------|----------------|
| Embedded order print default | **Ops + config** (not architecture redesign) | Deploy `PRINT_CONNECTOR_EXECUTION_MODE=remote` |
| Cancel not reaching RLC | **Implementation** | PRINT-CANCEL-DISTRIBUTED-1 |
| Runtime E2E gaps | **Certification re-run** | PRINT-PRODUCTION-VALIDATION-2 (staging pass) |
| M-1 not executed | **Ops** | Run migration per PRINT-PRINTER-CATALOG-1 checklist |
| FF-PC formalization | **Governance** | Declare FF-PC-01..04 in constitution/CI |

No new architecture program required for catalog compliance — ADR-ARCH-017 is implemented in software.
