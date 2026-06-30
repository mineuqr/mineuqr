# PRINT-UX-1 — Printer Management

**Date:** 2026-06-30

---

## Purpose

Printer Management is the **administrative** workspace for printer lifecycle. It is separate from daily Print Workspace operations.

---

## Responsibilities

| Action | Procedure |
|--------|-----------|
| Add printer | Opens `PrinterSelectionDialog` → `provisionPrinter` |
| Remove printer | `printerManagement.commands.removePrinter` |
| Rename printer | `printerManagement.commands.renamePrinter` |
| Refresh printer list | Refetch `listPrinters` / `discoverPrinters` |
| Set default printer | `printerManagement.commands.setDefaultPrinter` |
| Printer diagnostics | `printerManagement.read.getDiagnostics` |
| Printer capabilities | Shown in picker + diagnostics |
| Printer information | Registered printer rows |
| Printer status | Diagnostics + connector status |
| Test print | `printerManagement.commands.testPrint` |

---

## Server Layer

```
server/printer-management/
  contracts/printerManagementContracts.ts
  contracts/RestaurantPrinterRepository.ts
  infrastructure/DrizzleRestaurantPrinterRepository.ts
  services/PrinterManagementService.ts
  printerManagementComposition.ts
  printerManagementRouter.ts
```

`PrinterManagementService` orchestrates **only** via `PrintConnectorApi` and `RestaurantPrinterRepository`. It does **not** call Printing Service.

---

## Persistence

Migration `drizzle/0049_restaurant_printers.sql` — `restaurant_printers` table:

- Multiple printers per restaurant (`restaurantId` + `printerId` unique)
- `isDefault` flag (workspace shows default only today)
- `lastValidatedAt` updated on successful test print
- `capabilitiesJson` snapshot at provision time

Legacy `print_connector_selections` rows are migrated into `restaurant_printers` on first `getCurrentPrinter` read.

---

## Navigation

| Entry | Path |
|-------|------|
| Dashboard tab | `?restaurant={id}&section=printer-management` |
| Sidebar | Menu management → **Printer Management** |

---

## Multi-Printer Future (Prepared, Not Implemented)

The management list renders all registered printers with default badge. Workspace continues to show the default printer only. Department printers (kitchen, cashier) can be added without UI redesign.
