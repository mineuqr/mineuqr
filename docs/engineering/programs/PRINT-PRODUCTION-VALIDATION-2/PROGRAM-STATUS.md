# PRINT-PRODUCTION-VALIDATION-2 — Program Status

**Date:** 2026-06-30  
**Type:** Production Certification (evidence-based; no code changes)  
**Authority:** ADR-ARCH-016 v1.2 · ADR-ARCH-017 v1.1 · PRINT-ARCHITECTURE-2

---

## Final Decision

# Conditionally Certified

The distributed printing platform **passes software architecture certification** for Printer Catalog (ADR-ARCH-017) and printer-management execution paths. It **does not yet pass full production certification** for distributed order-print execution, RLC cancel propagation, and runtime/staging validation.

---

## Blocking Items

| ID | Area | Finding | Remediation |
|----|------|---------|-------------|
| **PV2-BLOCK-001** | Execution path | Order print defaults to **embedded** cloud `PrintConnectorRuntime` unless `PRINT_CONNECTOR_EXECUTION_MODE=remote`. No deployment config evidence sets `remote`. Violates ADR-ARCH-016 Rule 18 / PRINT-ARCHITECTURE-2 §7 (embedded non-production). | Set `PRINT_CONNECTOR_EXECUTION_MODE=remote` in production cloud deployment; verify order print routes through `RemotePrintConnectorPort`. |
| **PV2-BLOCK-002** | Cancel | `printWorkspace.commands.cancelPrint` updates cloud job state only. `GatewayRoutedPrintConnectorApi.cancel` → `routeCancelPrint` stack exists but has **no production caller**. RLC never receives cancel during workspace cancel. | New implementation program: wire distributed cancel when job is actively executing on RLC. |
| **PV2-BLOCK-003** | Runtime validation | No staging/production environment exercised for reconnect, failure injection, fresh install E2E, physical hardware, or Windows restart scenarios. Inherits gap from PRINT-PRODUCTION-VALIDATION-1. | Execute runtime certification checklist in staging with real RLC + printer; record evidence in TEST-EVIDENCE.md. |
| **PV2-BLOCK-004** | Upgrade / migration | ADR-ARCH-017 M-1 migration (`0050` + `LegacyPrinterSelectionMigrator`) not verified executed on target production tenants. | Run migration; verify defaults preserved and deleted printers not reactivated. |

---

## Non-Blocking Gaps

| ID | Finding | Notes |
|----|---------|-------|
| PV2-GAP-001 | Formal fitness functions `FF-PC-01`–`FF-PC-04` do not exist | Equivalent architecture guards + unit tests provide de facto coverage |
| PV2-GAP-002 | `print_connector_selections` table retained in schema | Retired from runtime; drop deferred per ADR M-4 |
| PV2-GAP-003 | ADR-ARCH-017 document header still says "Not implemented" | Registry updated to Implemented; ADR metadata stale |
| PV2-GAP-004 | No dedicated printer-catalog cross-tenant integration test | `assertRestaurantAccess` enforced on all routes; repo queries scoped by `restaurantId` |

---

## Certification Summary by Area

| # | Area | Result |
|---|------|--------|
| 1 | Architecture compliance | **CONDITIONAL** — ADR-017 PASS; ADR-016 PARTIAL |
| 2 | Execution path | **FAIL** — order print embedded default; cancel unwired |
| 3 | Runtime boundaries | **PASS** — software structure |
| 4 | Catalog integrity | **PASS** |
| 5 | Read purity | **PASS** |
| 6 | Discovery | **PASS** |
| 7 | Provision | **PASS** |
| 8 | Delete | **PASS** (software); runtime E2E pending |
| 9 | Reconnect | **CONDITIONAL** — code + unit tests only |
| 10 | Fresh installation | **CONDITIONAL** — software path clear; no runtime E2E |
| 11 | Upgrade scenario | **CONDITIONAL** — migrator exists; not executed in target env |
| 12 | Multi-tenant isolation | **PASS** (access control); no printer-specific E2E |
| 13 | Observability | **CONDITIONAL** — print ops events; enrollment/provision logging partial |
| 14 | Failure injection | **NOT EXECUTED** |
| 15 | Architecture guards | **PASS** — 46/46 |
| 16 | Fitness functions FF-PC-01..04 | **DOCUMENTED GAP** — identifiers not declared |

---

## Path to Production Certified

1. Resolve **PV2-BLOCK-001** — deploy with `PRINT_CONNECTOR_EXECUTION_MODE=remote`.
2. Resolve **PV2-BLOCK-002** — implement distributed cancel wiring.
3. Execute **PV2-BLOCK-003** — full staging runtime checklist with RLC + physical printer.
4. Execute **PV2-BLOCK-004** — M-1 migration on production-like data; verify outcomes.
5. Re-run PRINT-PRODUCTION-VALIDATION-2 with runtime evidence recorded.

---

## Executive Summary

PRINT-PRODUCTION-VALIDATION-2 certifies that **PRINT-PRINTER-CATALOG-1** successfully eliminated catalog architectural drift: `restaurant_printers` is the sole cloud catalog authority, reads are pure, discovery is observation-only, and deleted printers do not auto-restore in software tests.

The platform is **not yet fully production-certified** because order-print dispatch still defaults to embedded cloud execution, workspace cancel does not reach RLC, and no live environment validation was performed for reconnect, failure, or upgrade scenarios.

**PRINT-PRODUCTION-VALIDATION-2: CONDITIONALLY CERTIFIED**
