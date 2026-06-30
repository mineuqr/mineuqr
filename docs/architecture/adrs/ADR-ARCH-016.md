# ADR-ARCH-016: Distributed Printing Topology

> [← ADR-ARCH-015](../adrs/ADR-ARCH-014.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Version** | 1.1 |
| **Owner** | Architecture Authority |
| **Program** | PRINT-ARCHITECTURE-2 (ratified); amended by PRINT-CONNECTOR-NETWORK-1 |
| **Date** | 2026-06-30 |
| **Supersedes** | ADR-ARCH-016 v1.0 |
| **Amended By** | PRINT-CONNECTOR-NETWORK-1 |
| **Extends** | PRINT-CONNECTOR-ARCH-1 (`DeploymentRuntime` model) |
| **Implementation status** | Partial (PRINT-GATEWAY-1, PRINT-CONNECTOR-NETWORK-1 complete) |

## Amendments (v1.1)

| Amendment | Summary |
|-----------|---------|
| Connector Connection Direction | RLC MUST initiate and maintain outbound Connector Session; cloud NEVER initiates inbound connections to restaurant infrastructure |
| Gateway Responsibility Boundary | Gateway orchestrates only — never executes physical printing |
| Restaurant Local Connector Responsibility Boundary | RLC is infrastructure only — never owns business logic |
| Connector Session Authority | Connector Session is SSOT for connectivity, heartbeat, availability, and registration |

---

## Context

MineuQR is a cloud-native multi-tenant SaaS. Restaurants use browsers on heterogeneous devices. Printers are physically attached to restaurant premises. Investigation proved that **embedded** Print Connector discovery executes on the API host OS, making cloud-hosted discovery unable to see restaurant-local printers. This is an architectural boundary.

Existing printing architecture is correct for orchestration: Order → Printing Service → `PrintConnectorPort` → connector execution. Only **execution placement** must evolve for distributed SaaS.

Constraints: Do not redesign Order Domain, Printing Service, `PrintConnectorPort`, Print Workspace, Printer Management, or printing lifecycle.

PRINT-CONNECTOR-NETWORK-1 implemented the Connector Session protocol and confirmed the outbound connection model as production-mandatory for all deployment targets.

---

## Decision

Adopt **Cloud-orchestrated, restaurant-executed printing**:

1. **Restaurant Local Connector (RLC)** runs on an authorized on-premise host (`local_desktop` primary; `android`, `edge` future).
2. **Connector Gateway** (cloud) routes discovery, print, and status commands to the registered RLC for each `restaurantId`.
3. **Browser communicates only with cloud** — never directly with RLC.
4. **RLC initiates and maintains outbound Connector Session** to cloud (NAT-friendly). **MineuQR Cloud NEVER initiates inbound connections into restaurant infrastructure.**
5. **Cloud remains SSOT** for print jobs (`Printing Service`) and configured printers (`Printer Management`).
6. **RLC executes** OS discovery and physical print via existing `PrintConnectorApi`, `PlatformAdapter`, and `TransportAdapter`.
7. **`PrintConnectorPort` unchanged** for Printing Service — cloud composition uses a **remote port adapter** that delegates to the gateway; RLC uses in-process connector runtime.
8. **`embedded` deployment** is non-production for distributed restaurants (dev/CI/same-machine lab only).
9. **No simulated printer fallback** in production when RLC is offline — canonical failures only.

### Amendment — Connector Connection Direction

**Restaurant Local Connector (RLC) MUST always initiate and maintain the connection to MineuQR Cloud.**

**MineuQR Cloud MUST NEVER initiate inbound connections into restaurant infrastructure.**

All communication between the Connector Gateway and Restaurant Local Connector MUST occur through an **outbound Connector Session** established by the Restaurant Local Connector.

**This rule is mandatory for every deployment model.**

#### Motivation

- Works behind NAT without manual configuration
- Eliminates inbound firewall requirements
- Requires no VPN or port forwarding
- Simplifies restaurant installation
- Improves security
- Supports cloud-native SaaS deployment
- Reduces operational complexity
- Preserves deployment independence

---

## Mandatory Architecture Rules

### Rule 1 — Connection initiation

Restaurant Local Connector **always** initiates communication.

### Rule 2 — No inbound cloud connectivity

Cloud **never** requires inbound connectivity into restaurant infrastructure.

### Rule 3 — Transport direction preservation

All future transport implementations **MUST** preserve outbound-from-RLC communication direction (WebSocket, HTTP/2, gRPC, QUIC, and future transports).

### Rule 4 — Direction is immutable

Transport technology may change. **Connection direction may never change.**

### Rule 5 — Business layer isolation

Business layers remain **completely unaware** of communication direction.

### Rule 6 — Topology isolation

Deployment topology remains **completely isolated** from business logic.

### Rule 7 — Gateway boundary

Connector Gateway **MUST NEVER** execute physical printing. Gateway responsibilities are strictly limited to:

- Routing
- Authentication
- Authorization
- Connector resolution
- Connector availability
- Connector health
- Session orchestration

Physical printing belongs **exclusively** to Restaurant Local Connector.

### Rule 8 — RLC infrastructure boundary

Restaurant Local Connector **MUST NEVER** contain business logic. RLC is infrastructure only. It may perform only:

- Printer discovery
- Printer execution
- Platform integration
- Session management
- Transport

RLC must **never** own: orders, printing policy, print jobs, or business workflows.

### Rule 9 — Command authority

Restaurant Local Connector **MUST NEVER** accept business commands directly from browsers, desktop applications, or external clients. All printing commands **MUST** originate from MineuQR Cloud through Connector Gateway. Connector Gateway is the **only** trusted orchestration authority.

### Rule 10 — Connector Session authority

Connector Session is the **Single Source of Truth** for connector connectivity. Heartbeat, availability, registration, and session lifecycle **MUST** be derived exclusively from Connector Session.

### Rule 11 — Composition root termination

Deployment decisions **MUST** terminate at the Composition Root. Deployment topology must **never** leak into: Domain, Application, Business Logic, Printing Service, or `PrintConnectorPort`.

---

## Responsibility Partition

### Restaurant Local Connector owns

- Session establishment
- Session renewal
- Session recovery
- Heartbeats
- Session lifecycle
- OS printer discovery and physical print execution

### Connector Gateway owns

- Authentication
- Authorization
- Connector routing
- Connector availability
- Connector directory
- Connector health
- Session orchestration (cloud side)

### MineuQR Cloud never

- Opens outbound connections toward restaurant infrastructure for connector communication
- Executes physical printing
- Accepts direct browser-to-RLC business commands

---

## Consequences

### Positive

- Any browser, any device, can operate printing for a restaurant with one RLC.
- Platform adapters (Windows, macOS, Linux) remain valid on RLC host.
- Printing Service and business rules unchanged.
- Deployment independence preserved via `DeploymentRuntime`.
- Restaurant isolation via scoped credentials.
- NAT-friendly, zero port-forwarding restaurant onboarding.
- Clear infrastructure vs business boundary.

### Negative

- Restaurants must install and maintain RLC (operational requirement).
- Slight latency vs in-process embedded print.
- Offline scenarios require queued job drain (implementation complexity).

---

## Related Blueprint Sections

Printing Platform §Deployment, §Integration Boundaries

## Related Programs

| Program | Status | Role |
|---------|--------|------|
| PRINT-CONNECTOR-ARCH-1 | Complete | Deployment Runtime — extended, not replaced |
| PRINT-ARCHITECTURE-2 | Complete | Topology ratification |
| PRINT-GATEWAY-1 | Complete | Connector Gateway + remote port adapter |
| PRINT-CONNECTOR-NETWORK-1 | Complete | Connector Session protocol (amendment ratification) |
| PRINT-CONNECTOR-LOCAL-1 | Planned | RLC agent packaging |
| PRINT-UX-2 | Planned | Connector presence UX |
| PRINT-PRODUCTION-VALIDATION-2 | Planned | End-to-end certification |

## Related ADRs

- ADR-ARCH-012 (event-driven print dispatch — unchanged)
- ADR-ARCH-001 (order sovereignty — unchanged)

## Alternatives considered

| Alternative | Rejected because |
|---|---|
| Browser-direct printer access | Security, inconsistent multi-device UX |
| Cloud VPN to LAN | Ops/security cost |
| Cloud-initiated inbound to restaurant | Firewall/NAT complexity; security surface |
| Keep embedded for production | Proven failure for local printers |
| Per-operator connector | Unnecessary ops burden |

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)

**Engineering traceability:** `docs/engineering/programs/PRINT-ARCHITECTURE-2/`
