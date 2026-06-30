# PRINT-CONNECTOR-WINDOWS-1 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-CONNECTOR-WINDOWS-1 — Native Windows Platform Integration (RLC)  
**Authority:** [ADR-ARCH-016 v1.1](../../../architecture/adrs/ADR-ARCH-016.md)

---

## Mission

Resume Windows printing in its **correct architectural location**: the **Restaurant Local Connector (RLC)**, not the Cloud API.

Cloud never accesses Windows printers. RLC hosts `WindowsPlatformAdapter` and `PrintConnectorRuntime` for discovery, selection, status, and print execution.

---

## Execution Path

```
Printing Service → RemotePrintConnectorPort → Connector Gateway
  → Connector Session → RLC → WindowsPlatformAdapter → Windows Spooler → Printer
```

---

## Delivered Integration

| Component | Path |
|-----------|------|
| RLC Windows runtime | `server/connector-local/windows/` |
| Command handler | `RuntimeConnectorCommandHandler` |
| Runtime facade | `LocalConnectorRuntimeFacade` |
| Platform host | `PlatformAdapterHost` |
| Windows adapter (existing) | `server/print-connector/platform/windows/` |

---

## Exit Criteria

| Criterion | Status |
|-----------|--------|
| Windows adapter inside RLC | ✓ |
| Native discovery (Get-Printer / Win32_Printer) | ✓ |
| Selection, status, capabilities | ✓ |
| Print / reprint / test print | ✓ |
| Diagnostics | ✓ |
| Failure mapping | ✓ |
| No simulated printers in production (`RLC_RUNTIME=1`) | ✓ |
| Gateway/session/business unchanged | ✓ |
| Physical Windows validation | ✓ (see 07) |
