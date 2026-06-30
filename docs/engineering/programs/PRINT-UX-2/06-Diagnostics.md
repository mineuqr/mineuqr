# PRINT-UX-2 — Diagnostics (Section 4)

**Component:** `WorkspaceDiagnosticsSection.tsx`

---

## Operator Mode (default)

Three status cards:

1. Restaurant Local Connector
2. Connector Session
3. Current Printer

No raw JSON on the main workspace.

---

## Administrator Mode

Toggle **Administrator mode** in diagnostics footer.

**View Technical Report** — structured dialog (key-value fields, limited depth in operator view).

**Export Diagnostics** — downloads JSON file (not displayed inline).

---

## Technical Report Contents

- Connector health snapshot (from gateway directory)
- Session snapshot
- Printer diagnostics (from PrinterManagementService)
