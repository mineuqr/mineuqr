# PRINT-CONNECTOR-DISCOVERY-1 — System Overview

**Program:** Canonical Remote Discovery  
**Authority:** ADR-ARCH-016 v1.2  
**Type:** Architecture retirement (no new product features)

---

## Mission

Eliminate the final embedded printer discovery path from production. After this program, exactly one production discovery path exists:

```
Browser
  → Print Workspace read API
  → Connector Gateway (routing only)
  → Connector Session (transport only)
  → Restaurant Local Connector
  → Platform Adapter
  → Native printer discovery
```

Cloud never performs native printer discovery.

---

## Out of scope

- PrintingService business logic
- Print execution path changes
- Platform adapter implementations
- ADR-ARCH-016 amendments
