# PRINT-UX-2 — Printer Card (Section 3)

**Component:** `CurrentPrinterCard.tsx` (enhanced)

---

## Fields

| Field | Source |
|-------|--------|
| Printer name | `printer.displayName` |
| Driver | `printer.platform` |
| Platform | `printer.platform` |
| Paper width | `capabilities.paperWidthMm` |
| Online | `status.isOnline` |
| Ready | `status.isReady` |
| Default printer | `printer.isDefault` |
| Capabilities | raw text, cut, width |

---

## Actions

- **Change printer** — `PrinterSelectionDialog` (disabled when connector offline)
- **Test print** — `printWorkspace.commands.testPrint`
- **Management** — navigates to Printer Management

---

## Removed Legacy

- No simulated printer as primary entity
- No embedded-discovery assumptions in copy
