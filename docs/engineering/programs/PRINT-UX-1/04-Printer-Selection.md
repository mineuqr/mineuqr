# PRINT-UX-1 — Printer Selection Dialog

**Date:** 2026-06-30

---

## Component

`client/src/components/print-workspace/PrinterSelectionDialog.tsx`

Used from:

- Print Workspace — **Change printer** / **Add printer**
- Printer Management — **Add**

---

## Features

| Feature | Implementation |
|---------|----------------|
| Search | Client-side filter on name, platform, transport |
| Printer list | `printConnector.discoverPrinters` |
| Platform | Row metadata from discovery |
| Connection type | Transport label (usb, ethernet, wifi, bluetooth) |
| Capabilities | `printConnector.getPrinterCapabilities` when row selected |
| Refresh | Refetch discovery query |
| Cancel | Close dialog |
| Select | `printerManagement.commands.provisionPrinter` |

---

## API Boundary

Discovery and capabilities use **Print Connector** tRPC routes (`printConnector.*`).

Persistence uses **Printer Management** (`printerManagement.commands.provisionPrinter`).

No OS-specific APIs (`navigator.usb`, PowerShell, Bluetooth GATT) in UI — enforced by architecture guard tests.

---

## Interaction Model

1. Dialog opens → discovery query enabled
2. Operator searches / selects a row
3. Capabilities load for selected `printerId`
4. **Select** provisions with `setAsDefault: true` (default)
5. On success: invalidate `getCurrentPrinter` + `listPrinters`, close dialog

---

## Professional UX Notes

- Compact list with online/offline indicator
- Selected row highlight
- Loading spinners on discovery, capabilities, and provision
- Bilingual labels (EN / AR) consistent with dashboard
