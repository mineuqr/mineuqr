# PRINT-GATEWAY-1 — Gateway Architecture

**ADR:** [ADR-ARCH-016 v1.1](../../../architecture/adrs/ADR-ARCH-016.md)

> **ADR Rule 7:** Gateway orchestrates only — routing, authentication, authorization, resolution, availability, health, session orchestration. **Gateway MUST NEVER execute physical printing.**

> **ADR Rule 2:** Cloud never initiates inbound connections to restaurant infrastructure. Gateway receives RLC-initiated outbound Connector Sessions only.

---

## Gateway Responsibilities

The Connector Gateway **owns**:

- Connector registration
- Connector lookup (by `restaurantId`, `connectorInstanceId`)
- Connector availability and routing decisions
- Heartbeat ingestion and health evaluation
- Connector metadata and capabilities exposure (directory)

The gateway **does not own**:

- Orders, print job lifecycle, or printing business rules
- OS printer discovery or physical print execution
- Platform adapters or transport adapters

---

## Service Layer

```
ConnectorGatewayService
├── ConnectorRegistry        — register / unregister / session lookup
├── ConnectorResolver        — resolve active connector for restaurant
├── ConnectorHealthService   — heartbeat + availability evaluation
├── ConnectorDirectory       — read-only session and health listing
└── ConnectorExecutionPort   — transport stub (future network program)
```

All services are concrete classes behind injectable dependencies (`ConnectorRegistryRepository`, `ConnectorExecutionPort`).

---

## Domain Models

Defined in `server/connector-gateway/contracts/gatewayContracts.ts`:

| Model | Purpose |
|-------|---------|
| `ConnectorIdentity` | `restaurantId`, `connectorInstanceId`, `deploymentTarget` |
| `ConnectorSession` | Full registered connector state |
| `ConnectorStatus` | Availability, registration, health flags |
| `ConnectorHeartbeat` | Inbound liveness signal |
| `ConnectorCapability` | Discovery/execution capability flags |
| `ConnectorMetadata` | Label, version, host fingerprint |
| `ConnectorHealth` | Evaluated health snapshot |
| `ConnectorEndpoint` | Host label and process platform |
| `ConnectorRuntimeInfo` | Registration and heartbeat timestamps |
| `ConnectorRegistrationResult` | Registration outcome |

---

## Routing Flow

1. `RemotePrintConnectorPort.submit()` receives `PrintConnectorSubmission` from Printing Service.
2. Gateway `routePrint()` resolves connector for `restaurantId`.
3. If unregistered or offline → structured failure (no simulated fallback).
4. If available → `ConnectorExecutionPort.executePrint()` (stub returns `transport_unavailable` until network program).
5. Remote port reports success/failure via existing `PrintResultPort`.

---

## Persistence

`ConnectorRegistryRepository` interface abstracts session storage.  
`InMemoryConnectorRegistryRepository` is the PRINT-GATEWAY-1 default. Durable persistence is a future program concern.
