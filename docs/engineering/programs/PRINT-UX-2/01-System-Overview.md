# PRINT-UX-2 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-UX-2 — Distributed Printing Workspace  
**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)  
**Type:** UX & presentation — no business logic changes

---

## Mission

Redesign the Printing Workspace to reflect the **Distributed Printing Platform** defined in ADR-ARCH-016 v1.2.

Operators see connector, session, and printer health without implementation details or legacy embedded-printing concepts.

---

## Four Workspace Sections

| # | Section | Purpose |
|---|---------|---------|
| 1 | Restaurant Local Connector | On-premise connector health |
| 2 | Connector Session | Cloud session state |
| 3 | Current Printer | Configured printer + actions |
| 4 | Diagnostics | Operator cards; admin technical report |

---

## Architecture Constraints (Honored)

- PrintingService, PrintConnectorPort, Gateway, Session, RLC — **unchanged**
- UI consumes **read projections** via `printWorkspace.read.*`
- No raw JSON on operator workflow

---

## Data Sources

| UI Section | tRPC Procedure |
|------------|----------------|
| RLC | `printWorkspace.read.getLocalConnectorStatus` |
| Session | `printWorkspace.read.getConnectorSessionStatus` |
| Printer | `printWorkspace.read.getCurrentPrinter` |
| Diagnostics | `getDiagnosticsSummary`, `getTechnicalReport` |

Read projection: `PrintWorkspacePresenceReadService` → `ConnectorDirectory` (read-only).
