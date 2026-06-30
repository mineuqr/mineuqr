# ADR-ARCH-016: Distributed Printing Topology

> [← ADR-ARCH-014](../adrs/ADR-ARCH-014.md) · [Registry](../constitution/ADR-Registry.md)

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Version** | 1.2 |
| **Owner** | Architecture Authority |
| **Program** | PRINT-ARCHITECTURE-2 (ratified) |
| **Date** | 2026-06-30 |
| **Supersedes** | ADR-ARCH-016 v1.1 |
| **Approved By** | PRINT-GATEWAY-1 · PRINT-CONNECTOR-NETWORK-1 · PRINT-CONNECTOR-LOCAL-1 · PRINT-CONNECTOR-WINDOWS-1 |
| **Extends** | PRINT-CONNECTOR-ARCH-1 (`DeploymentRuntime` model) |
| **Implementation status** | Partial (Gateway, Session, RLC, Windows RLC complete) |

## Amendments

| Version | Summary |
|---------|---------|
| **v1.1** | Connector connection direction; gateway/RLC boundaries; Connector Session SSOT |
| **v1.2** | Full consolidation of Rules 1–21; canonical execution path (Rule 18); PlatformAdapterHost (Rule 19); LocalConnectorRuntimeFacade (Rule 20); simulation policy (Rule 21); governance |

---

## Context

MineuQR is a cloud-native multi-tenant SaaS. Restaurants use browsers on heterogeneous devices. Printers are physically attached to restaurant premises. **Embedded** Print Connector discovery on the API host cannot see restaurant-local printers.

Printing orchestration is correct: Order → Printing Service → `PrintConnectorPort` → connector execution. Only **execution placement** evolves for distributed SaaS.

Programs PRINT-GATEWAY-1, PRINT-CONNECTOR-NETWORK-1, PRINT-CONNECTOR-LOCAL-1, and PRINT-CONNECTOR-WINDOWS-1 validated this topology in implementation. This version consolidates all approved rules into a single constitutional reference.

---

## Decision

Adopt **Cloud-orchestrated, restaurant-executed printing** with one canonical production execution path (Rule 18).

---

## Mandatory Architecture Rules

### Rule 1 — RLC initiates connection

Restaurant Local Connector (RLC) **MUST** always initiate and maintain the connection to MineuQR Cloud. Cloud **MUST NEVER** initiate inbound connections into restaurant infrastructure.

### Rule 2 — Outbound Connector Session

All communication between Connector Gateway and RLC **MUST** occur through an outbound Connector Session established by RLC.

### Rule 3 — Transport technology may change

Future transports may include WebSocket, HTTP/2, gRPC, QUIC, and future protocols.

### Rule 4 — Connection direction is immutable

Transport technology may change. **Connection direction may NEVER change.**

### Rule 5 — Gateway never prints

Connector Gateway **MUST NEVER** execute physical printing. Gateway responsibilities are limited to:

- Authentication
- Authorization
- Connector routing
- Connector resolution
- Connector availability
- Connector health
- Connector directory
- Session orchestration

Gateway is **orchestration infrastructure only**.

### Rule 6 — RLC is infrastructure only

Restaurant Local Connector **MUST NEVER** contain business logic. RLC may perform **ONLY**:

- Printer discovery
- Printer execution
- Platform integration
- Session management
- Runtime diagnostics
- Runtime health
- Connector transport

### Rule 7 — RLC must not own business state

RLC **MUST NEVER** own: orders, print jobs, printing policy, workflow decisions, restaurant business state, or business rules.

### Rule 8 — No direct client commands to RLC

RLC **MUST NEVER** accept business commands directly from browsers, desktop applications, mobile applications, or external clients. All commands **MUST** originate from MineuQR Cloud through Connector Gateway.

### Rule 9 — Connector Session is SSOT for connectivity

Connector Session is the **Single Source of Truth** for: registration, authentication, heartbeats, availability, health, and session lifecycle.

### Rule 10 — Platform Adapters are RLC plugins

Platform Adapters are execution plugins hosted **exclusively** by RLC. They **MUST NEVER** communicate directly with Connector Gateway, Printing Service, Business Layer, or Order Domain. They communicate only through RLC.

### Rule 11 — Deployment terminates at composition root

Deployment decisions **MUST** terminate at the Composition Root. Deployment topology **MUST NEVER** leak into Domain Layer, Application Layer, Business Layer, Printing Service, or `PrintConnectorPort`.

### Rule 12 — PrintConnectorPort is deployment-independent

`PrintConnectorPort` remains the canonical printing contract. Its interface **MUST** remain deployment-independent. Business layers **MUST** remain unaware whether printing is embedded, remote, local connector, edge, Android, or future deployment targets.

### Rule 13 — PrintingService is business SSOT

PrintingService remains the **Single Source of Truth** for printing business logic. No infrastructure component may duplicate or own printing business behavior.

### Rule 14 — Session contracts only

Connector Gateway and RLC communicate **only** through canonical Connector Session contracts. No direct infrastructure shortcuts are permitted.

### Rule 15 — Platform isolation

Platform-specific functionality (Windows, macOS, Linux, Android) **MUST** remain isolated inside Platform Adapters. Cross-platform behavior **MUST** remain identical above the Platform Adapter layer.

### Rule 16 — Canonical platform contracts

Every future Platform Adapter **MUST** implement the same canonical contracts. Platform differences must never propagate upward.

### Rule 17 — Architecture before implementation

If implementation discovers a fundamental architectural gap: suspend the program, create an Architecture Program, approve an ADR, then resume. Implementation must **never** compensate for missing architecture.

### Rule 18 — Canonical execution path

Distributed printing follows **one** canonical production path only:

```
Printing Service
  ↓
PrintConnectorPort
  ↓
Remote PrintConnectorPort
  ↓
Connector Gateway
  ↓
Connector Session
  ↓
Restaurant Local Connector
  ↓
Platform Adapter
  ↓
Operating System
  ↓
Printer
```

No alternative production paths are permitted. (`embedded` is non-production for distributed restaurants.)

Infrastructure components **MUST** remain infrastructure only. Business responsibilities **MUST** remain inside the Business Layer.

### Rule 19 — PlatformAdapterHost authority

RLC **MUST** host Platform Adapters exclusively through **PlatformAdapterHost**. Platform Adapters **MUST NOT** be instantiated directly by Gateway, Connector Session, Business Layer, or composition outside RLC.

PlatformAdapterHost is the single authority for: adapter lifecycle, initialization, shutdown, health, and registration. All future platform implementations (Windows, macOS, Linux, Android) **MUST** use PlatformAdapterHost.

### Rule 20 — LocalConnectorRuntimeFacade boundary

RLC **MUST** expose runtime capabilities only through **LocalConnectorRuntimeFacade**. Gateway and Connector Session **MUST NEVER** communicate directly with Platform Adapters. RuntimeFacade is the canonical execution boundary between Connector Session and Platform Adapters.

### Rule 21 — Simulation policy

Simulation is permitted **only** for automated testing. Production runtime **MUST NEVER**: return simulated printers, automatically fall back to simulated adapters, or hide platform discovery failures. Discovery failures **MUST** be reported explicitly through canonical infrastructure errors.

---

## Responsibility Partition

| Component | Owns | Must never own |
|-----------|------|----------------|
| **Printing Service** | Print job business logic, lifecycle SSOT | OS print I/O |
| **Connector Gateway** | Auth, routing, registry, health, directory | Physical printing, business rules |
| **Connector Session** | Transport protocol, session SSOT | Business logic, OS I/O |
| **RLC** | Session client, platform execution, diagnostics | Orders, jobs, policy |
| **PlatformAdapterHost** | Adapter lifecycle on RLC | Gateway/session coupling |
| **LocalConnectorRuntimeFacade** | Runtime execution boundary | Direct gateway→adapter calls |
| **Platform Adapter** | OS discovery and print | Business logic, gateway comms |

---

## Governance

**ADR-ARCH-016 is the constitutional architecture for MineuQR Distributed Printing.**

### Architecture Evolution Policy

Future programs **MUST** implement this architecture.

Future programs **MUST NOT** redesign it.

Any proposal that changes:

- Connector responsibilities
- Gateway responsibilities
- Session authority
- Runtime boundaries
- Canonical execution path
- Deployment topology

requires a **new ADR** or a **formally approved amendment**.

Feature implementation must **evolve** the architecture. It must **never replace** it.

### Amendment process

Any future implementation that conflicts with this ADR requires either:

- A **new ADR**, or
- A **formally approved ADR amendment**

No implementation program may override ADR-ARCH-016 by implementation alone. **Architecture precedes implementation.**

---

## Consequences

### Positive

- Single authoritative reference for entire Distributed Printing Platform
- Clear boundaries validated by PRINT-GATEWAY-1 through PRINT-CONNECTOR-WINDOWS-1
- NAT-friendly, secure, cloud-native SaaS printing
- Platform independence with identical contracts above adapter layer

### Negative

- Restaurants must install and maintain RLC
- Architectural rigor required before new features (Rule 17)

---

## Related Programs

| Program | Status | Role |
|---------|--------|------|
| PRINT-ARCHITECTURE-2 | Complete | Topology ratification |
| PRINT-GATEWAY-1 | Complete | Connector Gateway + Remote PrintConnectorPort |
| PRINT-CONNECTOR-NETWORK-1 | Complete | Connector Session protocol |
| PRINT-CONNECTOR-LOCAL-1 | Complete | RLC runtime |
| PRINT-CONNECTOR-WINDOWS-1 | Complete | Windows platform in RLC |
| PRINT-UX-2 | Complete | Connector presence UX |
| PRINT-PRODUCTION-VALIDATION-2 | Planned | End-to-end certification |

## Related ADRs

- ADR-ARCH-012 (event-driven print dispatch)
- ADR-ARCH-001 (order sovereignty)

---

**Authority:** [Architecture Constitution v1.0](../constitution/Architecture-Constitution-v1.0.md) · [ADR Registry](../constitution/ADR-Registry.md)

**Engineering traceability:** `docs/engineering/programs/PRINT-ARCHITECTURE-2/`
