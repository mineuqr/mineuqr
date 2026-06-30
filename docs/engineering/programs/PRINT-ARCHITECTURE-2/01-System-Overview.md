# PRINT-ARCHITECTURE-2 — System Overview

**Date:** 2026-06-30  
**Program:** PRINT-ARCHITECTURE-2 — Distributed Printing Topology  
**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)  
**Type:** Architecture only — no implementation

---

## Problem Statement

MineuQR is cloud-native. The **embedded** Print Connector runs inside the API process and discovers printers on the **API host OS**. Restaurant printers are physically attached to **restaurant workstations**. Cloud discovery cannot see them. This is an **architectural boundary**, not a platform adapter defect.

---

## Canonical Solution

**Cloud-orchestrated, restaurant-executed printing.**

| Layer | Responsibility |
|-------|----------------|
| **Cloud** | Order → Printing Service → job lifecycle, printer catalog, operator UX, routing |
| **Restaurant Local Connector (RLC)** | OS discovery, platform/transport adapters, physical print execution |
| **Browser** | Cloud tRPC only — never direct OS or local connector access |

---

## Logical Components

```
┌──────────────────────────────────────────────────────────────┐
│ CLOUD                                                         │
│  Print Workspace / Printer Management  (UX — unchanged)       │
│  Printing Service                    (job SSOT — unchanged)   │
│  Printer Management catalog          (configured printers)    │
│  Connector Gateway                   (NEW — routing & presence) │
│  Remote PrintConnectorPort Adapter   (NEW — cloud-side port)  │
└───────────────────────────┬──────────────────────────────────┘
                            │ Connector Session (RLC-initiated outbound)
                            │ ADR-ARCH-016 Rule 1: RLC always initiates
┌───────────────────────────▼──────────────────────────────────┐
│ RESTAURANT PREMISES                                             │
│  Local Connector Host (Windows / macOS / Linux / Android)       │
│    DeploymentRuntime: local_desktop | android | edge            │
│    PrintConnectorApi (in-process on host)                       │
│    PlatformAdapter → TransportAdapter → OS → Physical Printer   │
└──────────────────────────────────────────────────────────────┘
```

---

## Immutable Boundaries (Preserved)

- Order Domain, Order Aggregate, business rules
- Printing Service lifecycle and persistence
- `PrintConnectorPort` contract (Printing Service view)
- `PrintConnectorApi` / platform & transport abstractions
- Print Workspace and Printer Management UX responsibilities

---

## Quality Attributes Addressed

| Attribute | Approach |
|-----------|----------|
| Scalability | Stateless cloud; one or more RLC per restaurant |
| Deployment independence | `DeploymentRuntime` selects execution location |
| Platform independence | Unchanged platform/transport adapters on RLC |
| Restaurant isolation | Tenant-scoped registration and routing |
| Fault tolerance | Job persistence in cloud; replay to RLC |
| Minimal ops complexity | Single lightweight agent per site (default) |
| One production path | Cloud job → gateway → RLC → OS |

---

## Out of Scope (This Program)

Connector runtime, network protocol, HTTP/WebSocket implementation, queues, UI changes, migrations, code.
