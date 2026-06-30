# ADR-ARCH-016: Distributed Printing Topology

| Field | Value |
|---|---|
| **Status** | Accepted — Ratified (PRINT-ARCHITECTURE-2) |
| **Owner** | Architecture Authority |
| **Program** | PRINT-ARCHITECTURE-2 |
| **Date** | 2026-06-30 |
| **Supersedes** | — |
| **Extends** | PRINT-CONNECTOR-ARCH-1 (`DeploymentRuntime` model) |

## Context

MineuQR is a cloud-native multi-tenant SaaS. Restaurants use browsers on heterogeneous devices. Printers are physically attached to restaurant premises. Investigation proved that **embedded** Print Connector discovery executes on the API host OS, making cloud-hosted discovery unable to see restaurant-local printers. This is an architectural boundary.

Existing printing architecture is correct for orchestration: Order → Printing Service → `PrintConnectorPort` → connector execution. Only **execution placement** must evolve for distributed SaaS.

Constraints: Do not redesign Order Domain, Printing Service, `PrintConnectorPort`, Print Workspace, Printer Management, or printing lifecycle.

## Decision

Adopt **Cloud-orchestrated, restaurant-executed printing**:

1. **Restaurant Local Connector (RLC)** runs on an authorized on-premise host (`local_desktop` primary; `android`, `edge` future).
2. **Connector Gateway** (cloud) routes discovery, print, and status commands to the registered RLC for each `restaurantId`.
3. **Browser communicates only with cloud** — never directly with RLC.
4. **RLC initiates outbound Connector Session** to cloud (NAT-friendly).
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

### Negative

- Restaurants must install and maintain RLC (operational requirement).
- New programs required: Connector Gateway, network session, local agent packaging.
- Slight latency vs in-process embedded print.
- Offline scenarios require queued job drain (implementation complexity).

## Related Blueprint Sections

Printing Platform §Deployment, §Integration Boundaries

## Related Programs

- PRINT-CONNECTOR-ARCH-1 (Deployment Runtime — extended, not replaced)
- PRINT-CONNECTOR-WINDOWS-1 (platform adapters on RLC host)
- PRINT-UX-1 (operational workspace — unchanged)
- **Future:** PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-LOCAL-1, PRINT-GATEWAY-1

## Related ADRs

- ADR-ARCH-012 (event-driven print dispatch — unchanged)
- ADR-ARCH-001 (order sovereignty — unchanged)

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Browser-direct printer access | Security, inconsistent multi-device UX |
| Cloud VPN to LAN | Ops/security cost |
| Keep embedded for production | Proven failure for local printers |
| Per-operator connector | Unnecessary ops burden |

---

**Authority:** Architecture Constitution v1.0 · ADR Registry (pending registry entry)
