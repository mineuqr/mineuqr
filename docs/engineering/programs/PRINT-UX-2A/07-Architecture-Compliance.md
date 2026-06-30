# PRINT-UX-2A — Architecture Compliance

**Authority:** ADR-ARCH-016 v1.2

---

## Unchanged

- ADR-ARCH-016
- PrintingService
- Connector Gateway / Session / RLC
- PrintConnectorPort
- Platform adapters
- Business logic

---

## Presentation stack

```
Print Workspace UI
  → useOperationalPrintStatus
  → printWorkspace.read (presence + current printer)
  → PrintWorkspacePresenceReadService → ConnectorDirectory (read-only)
```

No UI component imports gateway, session, or RLC modules directly.

---

## Architecture Evolution Policy

Feature implementation evolves the distributed UX — it does not replace ADR-ARCH-016.
