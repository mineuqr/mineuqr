# PRINT-CONNECTOR-LOCAL-1 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-CONNECTOR-LOCAL-1 — Restaurant Local Connector Runtime  
**Authority:** [ADR-ARCH-016 v1.1](../../../architecture/adrs/ADR-ARCH-016.md)

---

## Mission

Implement the first production-ready **Restaurant Local Connector (RLC)** runtime — the only component responsible for physical printer interaction inside restaurant infrastructure (platform adapters deferred to later programs).

RLC initiates **outbound** Connector Sessions to MineuQR Cloud per ADR Rule 1.

---

## Target Architecture

```
MineuQR Cloud → Connector Gateway → Connector Session
                                        ↑ (outbound)
                              Restaurant Local Connector
                                        ↓ (future)
                              Platform Adapter → Printer
```

---

## Delivered Module

| Path | Role |
|------|------|
| `server/connector-local/contracts/` | Identity, config, transport ports |
| `server/connector-local/services/` | Bootstrap, lifecycle, session client, health, diagnostics |
| `server/connector-local/infrastructure/` | Config provider, deferred command handler |
| `server/connector-local/connectorLocalComposition.ts` | Composition root |

---

## Exit Criteria

| Criterion | Status |
|-----------|--------|
| RLC runtime exists | ✓ |
| Bootstrap + lifecycle | ✓ |
| Identity + configuration | ✓ |
| Session client integrated | ✓ |
| Health + diagnostics | ✓ |
| Gateway/session unchanged | ✓ |
| Business layers unchanged | ✓ |
| `npm run check` + Vitest | ✓ |
