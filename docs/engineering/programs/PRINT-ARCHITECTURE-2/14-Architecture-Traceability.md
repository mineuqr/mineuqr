# PRINT-ARCHITECTURE-2 — Architecture Traceability

**Date:** 2026-06-30

---

## Immutable Components (Unchanged by This ADR)

| Component | Path / Contract | Status |
|-----------|-----------------|--------|
| Order Aggregate | `server/order/` | Unchanged |
| OrderPrintingConsumer | event consumer | Unchanged |
| Printing Service | `server/printing/` | Unchanged |
| `PrintConnectorPort` | `server/printing/contracts/ports/` | Interface unchanged |
| Print job lifecycle | `print_jobs` tables | Unchanged |
| Print Workspace | `client/.../print-workspace/` | Unchanged |
| Printer Management | `server/printer-management/` | Unchanged (cloud SSOT) |
| `PrintConnectorApi` | `server/print-connector/contracts/` | Unchanged |
| `PlatformAdapter` | `server/print-connector/platform/` | Runs on RLC |
| `TransportAdapter` | `server/print-connector/transport/` | Runs on RLC |
| `DeploymentRuntime` | `server/print-connector/deployment/` | Extended usage |

---

## New Logical Components (Future Implementation)

| Component | Responsibility | Program |
|-----------|----------------|---------|
| Connector Gateway | Session registry, routing, heartbeat | PRINT-GATEWAY-1 |
| Connector Session Layer | Duplex cloud↔RLC transport | PRINT-CONNECTOR-NETWORK-1 |
| Remote `PrintConnectorPort` adapter | Cloud delegation to gateway | PRINT-GATEWAY-1 |
| Local Connector Agent | RLC process packaging | PRINT-CONNECTOR-LOCAL-1 |
| Connector presence projection | Workspace/Management status | PRINT-UX-2 (tentative) |

---

## Problem → Decision Traceability

| Investigation finding | ADR decision |
|----------------------|--------------|
| Discovery on API host | RLC on premises |
| Browser uses `/api/trpc` only | Indirect communication |
| Simulated printer from old provisioning | Catalog SSOT; live discovery via RLC |
| `embedded` default today | Non-production for distributed SaaS |

---

## Deployment Target Traceability

| `DeploymentTarget` | PRINT-CONNECTOR-ARCH-1 | PRINT-ARCHITECTURE-2 |
|--------------------|--------------------------|----------------------|
| `embedded` | API in-process | Dev/CI only |
| `local_desktop` | Skeleton | **Production primary** |
| `android` | Skeleton | Future production |
| `edge` | Skeleton | Optional production |
| `future` | Reserved | Reserved |

---

## Implementation Roadmap

| Phase | Program | Deliverable |
|-------|---------|-------------|
| **P0** | PRINT-ARCHITECTURE-2 | This architecture (complete) |
| **P1** | PRINT-GATEWAY-1 | Connector Gateway + remote port adapter |
| **P2** | PRINT-CONNECTOR-NETWORK-1 | Session protocol + message contracts |
| **P3** | PRINT-CONNECTOR-LOCAL-1 | Windows desktop agent (`local_desktop`) |
| **P4** | PRINT-UX-2 | Connector status in Workspace/Management |
| **P5** | PRINT-CONNECTOR-ANDROID-1 | Android RLC |
| **P6** | PRINT-PRODUCTION-VALIDATION-2 | End-to-end distributed certification |

**Dependency order:** P1 → P2 → P3 → P4 → P6. P5 parallel after P2.

---

## Exit Criteria Mapping

| Criterion | Document |
|-----------|----------|
| Topology defined | 01, 02, 03 |
| Deployment models approved | 02, 12 |
| Communication topology approved | 04, 10 |
| Authentication approved | 05, 11 |
| Failure model approved | 09 |
| Offline model approved | 08 |
| Sequence diagrams | 10 |
| ADR approved | 13 |
| Traceability | This document |
| Implementation roadmap | This document §Implementation Roadmap |
