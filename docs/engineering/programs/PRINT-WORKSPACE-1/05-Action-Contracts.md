# PRINT-WORKSPACE-1 — Action Contracts

**Date:** 2026-06-29

---

## Server Contracts

`server/print-workspace/read/contracts/printWorkspaceActionContracts.ts`

| Command | Purpose |
|---------|---------|
| `PrintOrderCommand` | Future print trigger |
| `ReprintOrderCommand` | Future reprint |
| `PreviewTicketCommand` | Future ticket preview |
| `MarkPrintedCommand` | Future mark printed |
| `CancelPrintCommand` | Future cancel |

`PrintWorkspaceActionPort` — interface only, **no implementation**.

---

## Client Contracts

`client/src/lib/print-workspace/actionContracts.ts`

`disabledPrintWorkspaceActionPort` — no-op stub; UI buttons disabled with PRINTING-1 tooltip.

---

## Readiness

Contracts defined for PRINTING-1 / PRINT-CONNECTOR-1. Zero runtime print behavior.
