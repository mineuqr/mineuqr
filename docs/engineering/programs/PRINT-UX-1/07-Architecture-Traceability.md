# PRINT-UX-1 — Architecture Traceability

**Date:** 2026-06-30

---

## Program → Artifact Map

| Requirement | Artifact |
|-------------|----------|
| Operational workspace | `PrintWorkspacePanel.tsx`, `01-Operational-Workspace.md` |
| Printer management separation | `PrinterManagementPanel.tsx`, `printerManagementRouter.ts` |
| Provisioning lifecycle | `PrinterManagementService.provisionPrinter`, `03-Provisioning-Lifecycle.md` |
| Current printer card | `CurrentPrinterCard.tsx` |
| Printer selection dialog | `PrinterSelectionDialog.tsx` |
| Workspace operational only | Removed inline discovery from panel; guard tests |
| Connector unchanged | No edits under `server/print-connector/` runtime |
| Printing Service unchanged | No edits to print job lifecycle |
| Business logic unchanged | Order dispatch / printing consumers untouched |

---

## Server Files (New / Modified for UX)

| File | Role |
|------|------|
| `server/printer-management/**` | New management layer |
| `server/print-workspace/printWorkspaceRouter.ts` | Added `getCurrentPrinter`, `testPrint` |
| `server/routers.ts` | Mount `printerManagement` router |
| `drizzle/0049_restaurant_printers.sql` | Printer catalog persistence |

---

## Client Files (New / Modified for UX)

| File | Role |
|------|------|
| `CurrentPrinterCard.tsx` | Operational printer summary |
| `PrinterSelectionDialog.tsx` | Professional picker |
| `PrinterManagementPanel.tsx` | Admin workspace |
| `useCurrentPrinter.ts` | Current printer hook |
| `PrintWorkspacePanel.tsx` | Refactored operational flow |
| `RestaurantDashboardSidebar.tsx` | Printer Management nav |
| `Dashboard.tsx` | Section routing |
| `dashboardUrl.ts` | `printer-management` section |

---

## Unchanged Layers (Verified)

```
server/printing/                    — PRINTING-1 (no PRINT-UX-1 edits)
server/print-connector/runtime/     — connector runtime
server/print-connector/bootstrap/   — deployment bootstrap
server/order/.../OrderPrintingConsumer — business dispatch
```

---

## Test Traceability

| Test | Guards |
|------|--------|
| `PrinterManagementService.test.ts` | Provision + unconfigured current printer |
| `ux.architecture.guards.test.ts` | No platform code in UI; picker uses connector API |

---

## Dependency Direction

```
UI → tRPC → PrinterManagementService → PrintConnectorApi
UI → tRPC → PrintWorkspaceCommandService → PrintingService
UI → tRPC → PrintWorkspaceReadService → order_read_*
```

No reverse dependencies from connector or printing into printer-management UI.
