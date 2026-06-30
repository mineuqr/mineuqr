# PRINT-UX-1 — Provisioning Lifecycle

**Date:** 2026-06-30

---

## Approved Flow

```
No Printer
    ↓
Add Printer (Management or Workspace empty state)
    ↓
Discover Printers          printConnector.discoverPrinters
    ↓
Select Printer             UI selection in PrinterSelectionDialog
    ↓
Read Capabilities          printConnector.getPrinterCapabilities
    ↓
Save Restaurant Printer    printerManagement.commands.provisionPrinter
    ↓
Test Print                 printWorkspace.commands.testPrint (or management test)
    ↓
Ready                      CurrentPrinterCard shows configured + validated
```

---

## `provisionPrinter` Steps (Server)

1. `connector.getPrinterCapabilities({ restaurantId, printerId })`
2. `repository.save({ ...displayName, platform, transport, capabilities, isDefault })`
3. `connector.selectPrinter({ ... })` — syncs connector selection for runtime

---

## Test Print (UX Layer)

Test print bypasses Printing Service intentionally:

- `PrinterManagementService.testPrint()` calls `connector.print()` with `printJobId: 0` and synthetic `TEST-PRINT` payload
- On success, `repository.markValidated()` updates `lastValidatedAt`
- Operational workspace and management both expose test print

---

## Workspace Consumption

After provisioning, `printWorkspace.read.getCurrentPrinter` returns:

```typescript
{
  configured: true,
  printer: RestaurantPrinterDto,
  status: ConnectorPrinterStatus,
  isDefault: boolean,
  lastValidatedAt: string | null
}
```

Print and reprint commands use Printing Service unchanged; connector selection is already aligned via provision/set-default.

---

## Empty States

| State | UX |
|-------|-----|
| No printer | Amber banner + **Add printer** + **Management** |
| Printer not ready | Red status on card; operator may test or change printer |
| Validated | `lastValidatedAt` shown on card |
