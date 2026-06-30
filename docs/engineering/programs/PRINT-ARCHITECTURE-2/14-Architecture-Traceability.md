# PRINT-ARCHITECTURE-2 — Architecture Traceability

**Date:** 2026-06-30  
**Authority:** [ADR-ARCH-016 v1.1](../../../architecture/adrs/ADR-ARCH-016.md)

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

## New Logical Components

| Component | Responsibility | Program | Status |
|-----------|----------------|---------|--------|
| Connector Gateway | Session registry, routing, heartbeat, auth orchestration | PRINT-GATEWAY-1 | **Complete** |
| Connector Session Layer | Outbound RLC-initiated transport protocol | PRINT-CONNECTOR-NETWORK-1 | **Complete** |
| Remote `PrintConnectorPort` adapter | Cloud delegation to gateway | PRINT-GATEWAY-1 | **Complete** |
| Local Connector Agent | RLC process packaging | PRINT-CONNECTOR-LOCAL-1 | Planned |
| Connector presence projection | Workspace/Management status | PRINT-UX-2 | Planned |

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

## ADR-ARCH-016 v1.1 Amendment Traceability

| Amendment | Validated by |
|-----------|--------------|
| Connector Connection Direction | PRINT-CONNECTOR-NETWORK-1 (`acceptConnection`, outbound RLC model) |
| Gateway Responsibility Boundary | PRINT-GATEWAY-1 (no OS print I/O) |
| RLC Infrastructure Boundary | PRINT-ARCHITECTURE-2 + ADR Rules 8–9 |
| Connector Session Authority | PRINT-CONNECTOR-NETWORK-1 + PRINT-GATEWAY-1 heartbeat |

**Canonical ADR:** `docs/architecture/adrs/ADR-ARCH-016.md`

---

## Implementation Roadmap

| Phase | Program | Deliverable | Status |
|-------|---------|-------------|--------|
| **P0** | PRINT-ARCHITECTURE-2 | Architecture + ADR-ARCH-016 | **Complete** |
| **P1** | PRINT-GATEWAY-1 | Connector Gateway + remote port adapter | **Complete** |
| **P2** | PRINT-CONNECTOR-NETWORK-1 | Session protocol + transport abstraction | **Complete** |
| **P3** | PRINT-CONNECTOR-LOCAL-1 | Windows desktop agent (`local_desktop`) | Planned |
| **P4** | PRINT-UX-2 | Connector status in Workspace/Management | Planned |
| **P5** | PRINT-CONNECTOR-ANDROID-1 | Android RLC | Planned |
| **P6** | PRINT-PRODUCTION-VALIDATION-2 | End-to-end distributed certification | Planned |

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
