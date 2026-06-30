# PRINT-ARCHITECTURE-2 — Architecture Traceability

**Date:** 2026-06-30  
**Authority:** [ADR-ARCH-016 v1.2](../../../architecture/adrs/ADR-ARCH-016.md)

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
| Local Connector Agent | RLC process + platform execution | PRINT-CONNECTOR-LOCAL-1 | **Complete** |
| Windows RLC runtime | PlatformAdapterHost + RuntimeFacade | PRINT-CONNECTOR-WINDOWS-1 | **Complete** |
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

## ADR-ARCH-016 v1.2 Consolidation Traceability

| Rule group | Validated by |
|------------|--------------|
| Rules 1–4 (connection direction) | PRINT-CONNECTOR-NETWORK-1 |
| Rules 5, 13–14, 18 (gateway boundary) | PRINT-GATEWAY-1 |
| Rules 6–8, 19–21 (RLC infrastructure) | PRINT-CONNECTOR-LOCAL-1, PRINT-CONNECTOR-WINDOWS-1 |
| Rules 9–10, 19–20 (session + platform hosting) | PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-WINDOWS-1 |
| Rules 12–13 (business SSOT) | PRINT-ARCHITECTURE-2 (unchanged PrintingService / port) |
| Rule 17 (architecture before implementation) | Governance — all programs |
| Rule 18 (canonical execution path) | End-to-end integration across P1–P4 |

**Canonical ADR:** `docs/architecture/adrs/ADR-ARCH-016.md` (v1.2 — 21 mandatory rules)

---

## Implementation Roadmap

| Phase | Program | Deliverable | Status |
|-------|---------|-------------|--------|
| **P0** | PRINT-ARCHITECTURE-2 | Architecture + ADR-ARCH-016 | **Complete** |
| **P1** | PRINT-GATEWAY-1 | Connector Gateway + remote port adapter | **Complete** |
| **P2** | PRINT-CONNECTOR-NETWORK-1 | Session protocol + transport abstraction | **Complete** |
| **P3** | PRINT-CONNECTOR-LOCAL-1 | RLC runtime (`local_desktop`) | **Complete** |
| **P3b** | PRINT-CONNECTOR-WINDOWS-1 | Windows PlatformAdapterHost + RuntimeFacade | **Complete** |
| **P4** | PRINT-UX-2 | Connector status in Workspace/Management | **Complete** |
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
