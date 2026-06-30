# ADR-ARCH-016: Distributed Printing Topology

> **Canonical authority:** [`docs/architecture/adrs/ADR-ARCH-016.md`](../../../architecture/adrs/ADR-ARCH-016.md)  
> This document is an engineering program mirror. When in conflict, the canonical ADR governs.

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Version** | 1.1 |
| **Owner** | Architecture Authority |
| **Program** | PRINT-ARCHITECTURE-2; amended by PRINT-CONNECTOR-NETWORK-1 |
| **Date** | 2026-06-30 |
| **Supersedes** | ADR-ARCH-016 v1.0 |
| **Amended By** | PRINT-CONNECTOR-NETWORK-1 |
| **Extends** | PRINT-CONNECTOR-ARCH-1 (`DeploymentRuntime` model) |

## Amendments (v1.1)

- **Connector Connection Direction** — RLC initiates outbound Connector Session; cloud never initiates inbound to restaurant infrastructure
- **Gateway Responsibility Boundary** — gateway orchestrates only; never physical printing
- **Restaurant Local Connector Responsibility Boundary** — RLC is infrastructure only
- **Connector Session Authority** — Connector Session is SSOT for connectivity

See canonical ADR for full mandatory Rules 1–11.

---

## Context

MineuQR is a cloud-native multi-tenant SaaS. Restaurants use browsers on heterogeneous devices. Printers are physically attached to restaurant premises. Investigation proved that **embedded** Print Connector discovery executes on the API host OS, making cloud-hosted discovery unable to see restaurant-local printers. This is an architectural boundary.

Existing printing architecture is correct for orchestration: Order → Printing Service → `PrintConnectorPort` → connector execution. Only **execution placement** must evolve for distributed SaaS.

## Decision

Adopt **Cloud-orchestrated, restaurant-executed printing**:

1. **Restaurant Local Connector (RLC)** runs on an authorized on-premise host (`local_desktop` primary; `android`, `edge` future).
2. **Connector Gateway** (cloud) routes discovery, print, and status commands to the registered RLC for each `restaurantId`.
3. **Browser communicates only with cloud** — never directly with RLC.
4. **RLC initiates and maintains outbound Connector Session** to cloud (NAT-friendly). **Cloud NEVER initiates inbound connections to restaurant infrastructure.**
5. **Cloud remains SSOT** for print jobs (`Printing Service`) and configured printers (`Printer Management`).
6. **RLC executes** OS discovery and physical print via existing `PrintConnectorApi`, `PlatformAdapter`, and `TransportAdapter`.
7. **`PrintConnectorPort` unchanged** for Printing Service — cloud composition uses a **remote port adapter** that delegates to the gateway; RLC uses in-process connector runtime.
8. **`embedded` deployment** is non-production for distributed restaurants (dev/CI/same-machine lab only).
9. **No simulated printer fallback** in production when RLC is offline — canonical failures only.

## Consequences

### Positive

- Any browser, any device, can operate printing for a restaurant with one RLC.
- Platform adapters (Windows, macOS, Linux) remain valid on RLC host.
- Printing Service and business rules unchanged.
- Deployment independence preserved via `DeploymentRuntime`.
- Restaurant isolation via scoped credentials.
- NAT-friendly outbound-only connectivity (v1.1).

### Negative

- Restaurants must install and maintain RLC (operational requirement).
- Slight latency vs in-process embedded print.
- Offline scenarios require queued job drain (implementation complexity).

## Related Programs

| Program | Status |
|---------|--------|
| PRINT-CONNECTOR-ARCH-1 | Complete |
| PRINT-ARCHITECTURE-2 | Complete |
| PRINT-GATEWAY-1 | Complete |
| PRINT-CONNECTOR-NETWORK-1 | Complete (amendment ratification) |
| PRINT-CONNECTOR-LOCAL-1 | Planned |

## Related ADRs

- ADR-ARCH-012 (event-driven print dispatch — unchanged)
- ADR-ARCH-001 (order sovereignty — unchanged)

---

**Authority:** Architecture Constitution v1.0 · [ADR Registry](../../../architecture/constitution/ADR-Registry.md)
